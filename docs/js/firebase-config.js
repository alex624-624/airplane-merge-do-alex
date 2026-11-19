// Dados do projeto Firebase onde ficam as contas e o progresso.
// Não são segredos: todo site que usa o Firebase mostra esses dois valores.
// Quem protege os dados são as regras em firestore.rules.
//
// Com FIREBASE = null o jogo usa o servidor local (npm start) e guarda as contas neste computador.
export const FIREBASE = null;

// Exemplo preenchido:
// export const FIREBASE = { apiKey: 'AIza…', projectId: 'meu-projeto' };
