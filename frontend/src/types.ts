export type Role = "patient" | "doctor" | "admin";

export interface User {
  id: number;
  phone: string;
  full_name: string;
  email: string | null;
  role: Role;
}

export interface Profile {
  id: number;
  full_name: string;
  dob: string;
  gender: string;
  relation: string;
  id_number_masked: string | null;
  bhyt_code_masked: string | null;
  bhyt_rate: number | null;
  hospital_patient_code: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  has_id_images: boolean;
}

export interface Department {
  id: number;
  name: string;
  description: string | null;
}

export interface ServiceType {
  id: number;
  name: string;
  allow_bhyt: boolean;
  choose_doctor: boolean;
}

export interface Doctor {
  id: number;
  department_id: number;
  title: string;
  full_name: string;
  bio: string | null;
  schedule: { weekday: number; shift: "morning" | "afternoon"; service_type: string; room: string }[];
}

export interface Slot {
  session_id: number;
  slot_time: string;
  remaining: number;
  doctor_id: number;
  doctor_name: string;
  room: string;
  service_type: string;
  price: number;
}

export type PayerType = "none" | "bhyt_dung_tuyen" | "bhyt_trai_tuyen" | "bao_lanh";

export type AppointmentStatus =
  | "pending_payment"
  | "confirmed"
  | "completed"
  | "expired"
  | "cancelled"
  | "need_reschedule";

export interface Appointment {
  id: number;
  code: string;
  status: AppointmentStatus;
  session_id: number;
  department_id: number;
  service_type_id: number;
  profile_id: number;
  patient_name: string;
  department: string;
  doctor_name: string;
  room: string;
  service_type: string;
  slot_time: string;
  queue_no: number | null;
  estimated_time: string | null;
  payer_type: PayerType;
  price: number;
  payment_status: "pending" | "paid" | "refunded";
  hold_expires_at: string | null;
  edit_count: number;
}

export interface Ticket extends Appointment {
  qr_payload: string;
  instructions: string;
}

export interface BookingResult {
  appointment: Appointment;
  warnings: string[];
}

export interface Draft {
  id: string;
  status: "open" | "used" | "discarded";
  patient_name: string;
  department: string;
  doctor_name: string;
  room: string;
  service_type: string;
  slot_time: string;
  payer_type: PayerType;
  price: number;
  expires_at: string;
}

export type Card =
  | { type: "booking_draft"; draft: Draft; warnings: string[] }
  | { type: "cancel_confirm"; appointment: Appointment }
  | { type: "reschedule_confirm"; appointment: Appointment; new_slot: { session_id: number; slot_time: string; label: string } }
  | { type: "emergency"; category: string };

export interface Source {
  title: string;
  url: string | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  cards: Card[];
  sources: Source[];
}

export interface ChatReply {
  reply: string;
  cards: Card[];
  sources: Source[];
  emergency: boolean;
}
