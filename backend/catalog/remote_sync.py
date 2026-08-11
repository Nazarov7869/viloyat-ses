"""
Pulls per-district statistics either from the district's own remotely-deployed
SES server (when configured in Django admin via DistrictServerConfig) or, if
none is configured or the remote call fails, computes them from local data.

Expected contract for a district's remote `stats_path` endpoint:

    GET {base_url}{stats_path}
    -> 200 {
         "total_clients": int, "today_clients": int, "pending_clients": int,
         "paid_clients": int, "revenue": number
       }
"""
import concurrent.futures

import requests
from django.db.models import Sum
from django.utils import timezone

from clients.models import Client

from .models import District, DistrictServerConfig

REQUEST_TIMEOUT_SECONDS = 3


def _auth_headers_and_auth(config: DistrictServerConfig):
    headers = {}
    auth = None
    if config.auth_type == DistrictServerConfig.AUTH_API_KEY and config.api_key:
        headers[config.api_key_header or 'X-API-Key'] = config.api_key
    elif config.auth_type == DistrictServerConfig.AUTH_BEARER and config.api_key:
        headers['Authorization'] = f'Bearer {config.api_key}'
    elif config.auth_type == DistrictServerConfig.AUTH_BASIC and config.username:
        auth = (config.username, config.password)
    return headers, auth


def fetch_remote_stats(config: DistrictServerConfig):
    if not config.base_url:
        return None
    url = config.base_url.rstrip('/') + '/' + config.stats_path.lstrip('/')
    headers, auth = _auth_headers_and_auth(config)
    try:
        response = requests.get(url, headers=headers, auth=auth, timeout=REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
        data = response.json()
        return {
            'total_clients': int(data.get('total_clients', 0) or 0),
            'today_clients': int(data.get('today_clients', 0) or 0),
            'pending_clients': int(data.get('pending_clients', 0) or 0),
            'paid_clients': int(data.get('paid_clients', 0) or 0),
            'revenue': float(data.get('revenue', 0) or 0),
        }
    except Exception as exc:  # noqa: BLE001 - any network/parse failure just falls back to local data
        DistrictServerConfig.objects.filter(pk=config.pk).update(last_error=str(exc)[:500])
        return None


def local_stats(district: District):
    today = timezone.localdate()
    clients = Client.objects.filter(district=district)
    revenue = clients.filter(payment_status='tolangan').aggregate(total=Sum('payment_amount'))['total']
    return {
        'total_clients': clients.count(),
        'today_clients': clients.filter(registered_at__date=today).count(),
        'pending_clients': clients.filter(payment_status='kutilmoqda').count(),
        'paid_clients': clients.filter(payment_status='tolangan').count(),
        'revenue': float(revenue or 0),
    }


def district_stats_row(district: District):
    config = getattr(district, 'server_config', None)
    if config and config.is_enabled and config.base_url:
        remote = fetch_remote_stats(config)
        if remote is not None:
            DistrictServerConfig.objects.filter(pk=config.pk).update(
                last_synced_at=timezone.now(), last_error='',
            )
            return {**remote, 'source': 'remote'}
        return {**local_stats(district), 'source': 'remote_error'}
    return {**local_stats(district), 'source': 'local'}


def all_district_stats(districts):
    """Fetches every district's stats concurrently so N remote calls cost ~one timeout, not N."""
    districts = list(districts)
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(8, len(districts)))) as executor:
        future_to_district = {executor.submit(district_stats_row, d): d for d in districts}
        rows = {}
        for future in concurrent.futures.as_completed(future_to_district):
            district = future_to_district[future]
            rows[district.id] = future.result()

    return [
        {
            'id': str(d.id),
            'name': d.name,
            'code': d.code,
            'sort_order': d.sort_order,
            **rows[d.id],
        }
        for d in districts
    ]
