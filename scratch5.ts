import { z } from 'zod';
const schema = z.nullable(z.string());
const opt = z.optional(z.string());
console.log('nullable def:', Object.keys(schema._def), 'innerType:', !!schema._def.innerType);
console.log('optional def:', Object.keys(opt._def), 'innerType:', !!opt._def.innerType);
