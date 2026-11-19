// Escolhe onde ficam as contas e o progresso: Firebase (site publicado) ou servidor local.
import { FIREBASE } from './firebase-config.js';
import { serverApi } from './backend-server.js';
import { firebaseApi } from './backend-firebase.js';

export const api = FIREBASE && FIREBASE.apiKey && FIREBASE.projectId ? firebaseApi(FIREBASE) : serverApi;
