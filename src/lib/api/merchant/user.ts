import type { MerchantUserFormData } from "@/types/merchant/user";

const MERCHANT_USER_REGISTER_PATH = "/producer/register";

export function buildRegisterFormData(
  data: MerchantUserFormData,
  ticket: string,
  photo: File | null,
): FormData {
  const fd = new FormData();
  fd.append("ticket", ticket);
  fd.append("firstName", data.firstName);
  fd.append("lastName", data.lastName);
  fd.append("personType", data.personType);
  fd.append("idNumber", data.idNumber);
  fd.append("producerCode", data.producerCode);
  if (data.licenseNumber.trim()) fd.append("licenseNumber", data.licenseNumber);
  fd.append("phone", data.phoneNumber);
  if (photo) fd.append("photo", photo);
  return fd;
}

export function merchantUserRegister(fd: FormData): Promise<Response> {
  return fetch(MERCHANT_USER_REGISTER_PATH, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
}
