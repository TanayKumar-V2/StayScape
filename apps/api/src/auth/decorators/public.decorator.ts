import { SetMetadata, CustomDecorator } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../auth.constants';

export const Public = (): CustomDecorator<string> => SetMetadata(IS_PUBLIC_KEY, true);
