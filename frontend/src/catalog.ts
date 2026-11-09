import { useEffect, useState } from "react";

import { api } from "./api";
import type { Department, Doctor } from "./types";

// Danh mục ít thay đổi: tải một lần, các trang và header dùng chung
let departmentsPromise: Promise<Department[]> | null = null;
let doctorsPromise: Promise<Doctor[]> | null = null;

function useCached<T>(load: () => Promise<T>): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let alive = true;
    load()
      .then((value) => alive && setData(value))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [load]);
  return data;
}

const loadDepartments = () => {
  departmentsPromise ??= api<Department[]>("/departments").catch((error) => {
    departmentsPromise = null;
    throw error;
  });
  return departmentsPromise;
};

const loadDoctors = () => {
  doctorsPromise ??= api<Doctor[]>("/doctors").catch((error) => {
    doctorsPromise = null;
    throw error;
  });
  return doctorsPromise;
};

/** Danh sách khoa, `null` khi đang tải. */
export const useDepartments = () => useCached(loadDepartments);
/** Danh sách bác sĩ, `null` khi đang tải. */
export const useDoctors = () => useCached(loadDoctors);
