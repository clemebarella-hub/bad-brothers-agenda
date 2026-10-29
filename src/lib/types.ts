export type Business = {
  id: string;
  slug: string;
  name: string;
  whatsapp_phone: string | null;
};

export type Barber = {
  id: string;
  business_id: string;
  name: string;
  active: boolean;
};

export type Service = {
  id: string;
  business_id: string;
  name: string;
  duration_min: number;
  price_clp: number;
  active: boolean;
};

export type AppointmentRow = {
  id: string;
  start_time: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  barbers: { name: string } | null;
  services: { name: string; price_clp: number } | null;
};
