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

// Al *editar*, omitir las cadenas vacías hace imposible borrar un campo ya guardado: el
// backend nunca recibe la intención de limpiarlo, así que responde 200 y conserva el
// valor anterior (el usuario ve "guardado correctamente" y nada cambió). Aquí se manda
// `null` explícito, que el backend sí interpreta como "vaciar esta columna".
//
// `nullableKeys` es obligatorio y acotado a propósito: hay columnas NOT NULL (name,
// country, los tres colores de marca) donde mandar null reventaría con un 500, así que
// para esas se mantiene el comportamiento de omitir.
export function blankToNull<T extends object>(
  obj: T,
  nullableKeys: readonly (keyof T)[]
): Partial<T> {
  const nullable = new Set(nullableKeys);
  const result: Partial<T> = { ...obj };
  (Object.keys(result) as (keyof T)[]).forEach((key) => {
    if (result[key] !== "") return;
    if (nullable.has(key)) {
      result[key] = null as T[keyof T];
    } else {
      delete result[key];
    }
  });
  return result;
}
