import { z } from 'zod';
const schema = z.array(z.object({ a: z.string() }));
console.log(schema._def);
