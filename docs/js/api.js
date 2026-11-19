// Escolhe onde ficam as contas e o progresso: no aparelho (site publicado) ou no servidor local.
import { SERVIDOR } from './modo.js';
import { serverApi } from './backend-server.js';
import { localApi } from './backend-local.js';

export const api = SERVIDOR ? serverApi : localApi;
