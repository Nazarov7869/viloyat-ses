import { useEffect, useState } from "react";
import api from "@/lib/api";
import { logError } from "@/lib/logger";
import type { Laboratory, ServiceRow } from "@/lib/ses";

export interface DistrictOption {
  id: string;
  name: string;
  code: string;
  sort_order: number;
}

export const useCatalog = () => {
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [labRes, svcRes, distRes] = await Promise.all([
        api.get<Laboratory[]>("/laboratories/"),
        api.get<ServiceRow[]>("/services/"),
        api.get<DistrictOption[]>("/districts/", { params: { is_active: true } }),
      ]);
      setLaboratories(labRes.data ?? []);
      setServices(svcRes.data ?? []);
      setDistricts(distRes.data ?? []);
    } catch (error) {
      logError("Katalogni yuklashda xatolik:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { laboratories, services, districts, loading, reload: load };
};
