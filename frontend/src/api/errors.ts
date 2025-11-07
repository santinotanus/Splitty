
// ✅ Manejo de errores reutilizable (opcional)
export const getServerErrorMessage = (error: any): string => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message) return error.message;
  return "Error desconocido en el servidor";
};

// ✅ Verificación de tipos de error (opcional)
export const isValidationError = (error: any): boolean => {
  return error?.response?.status === 400 && !!error?.response?.data?.issues;
};

export const isEmailInUse = (error: any): boolean => {
  return (
    error?.response?.status === 409 ||
    (typeof error?.response?.data?.message === "string" &&
      error.response.data.message.toLowerCase().includes("correo ya"))
  );
};
