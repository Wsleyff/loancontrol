export function dateBR(value:string|Date){return new Intl.DateTimeFormat("pt-BR").format(new Date(value))}
