import { useEffect, useState } from "react";
import { fetchMe } from "@/lib/auth";
import { logError } from "@/lib/logger";

export interface UserContext {
  loading: boolean;
  userId: string | null;
  email: string | null;
  role: string | null;
  districtId: string | null;
  districtName: string | null;
  laboratoryId: string | null;
  laboratoryCode: string | null;
  laboratoryName: string | null;
  isProvince: boolean;
  reload: () => void;
}

const initialState = {
  loading: true,
  userId: null,
  email: null,
  role: null,
  districtId: null,
  districtName: null,
  laboratoryId: null,
  laboratoryCode: null,
  laboratoryName: null,
  isProvince: false,
};

export const useUserContext = (): UserContext => {
  const [state, setState] = useState(initialState);

  const load = async () => {
    try {
      const me = await fetchMe();
      setState(
        me
          ? {
              loading: false,
              userId: me.user_id,
              email: me.email,
              role: me.role,
              districtId: me.district_id,
              districtName: me.district_name,
              laboratoryId: me.laboratory_id,
              laboratoryCode: me.laboratory_code,
              laboratoryName: me.laboratory_name,
              isProvince: me.is_province,
            }
          : { ...initialState, loading: false },
      );
    } catch (error) {
      logError("Foydalanuvchi kontekstini olishda xatolik:", error);
      setState({ ...initialState, loading: false });
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { ...state, reload: load };
};
