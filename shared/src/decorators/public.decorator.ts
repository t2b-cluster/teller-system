import { SetMetadata } from '@nestjs/common';

/** Mark a route as public — skips JWT auth guard */
export const Public = () => SetMetadata('isPublic', true);
