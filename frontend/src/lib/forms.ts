// Los formularios usan "" como valor inicial de los campos opcionales (para que los
// <input> sean controlados desde el primer render), pero el backend espera que un
// campo opcional ausente sea `None`, no una cadena vacía — algunos, como el email,
// además la rechazan con un 422 (EmailStr no acepta ""). Sacar las claves con "" antes
// de enviar deja que el backend use sus propios defaults en vez de guardar strings vacías.
export function omitEmptyStrings<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = { ...obj };
  (Object.keys(result) as (keyof T)[]).forEach((key) => {
    if (result[key] === "") {
      delete result[key];
    }
  });
  return result;
}
