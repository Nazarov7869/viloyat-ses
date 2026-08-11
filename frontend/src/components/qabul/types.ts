export interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  birth_year: string;
  birth_date: string | null;
  address: string;
  workplace: string;
  phone: string | null;
  pinfl: string | null;
  gender: string | null;
  region: string | null;
  visit_type: string | null;
  notes: string | null;
  service_type: string;
  district_id: string | null;
  registered_at: string;
}

export interface AdmissionItemRow {
  id: string;
  service_name: string;
  sample_type: string | null;
  price: number;
  quantity: number;
  laboratory_id: string | null;
}

export interface LabOrderRow {
  id: string;
  admission_id: string;
  admission_item_id: string | null;
  client_id: string;
  laboratory_id: string;
  service_name: string;
  sample_type: string | null;
  status: string;
  result_text: string | null;
  result_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  operator_name: string | null;
  created_at: string;
}

export interface AdmissionRow {
  id: string;
  order_number: string;
  client_id: string;
  created_at: string;
  total_amount: number;
  discount_amount: number;
  paid_amount: number;
  payment_method: string;
  payment_status: string;
  process_status: string;
  operator_name: string | null;
  notes: string | null;
  clients: ClientRow | null;
  admission_items: AdmissionItemRow[];
  lab_orders: LabOrderRow[];
}