# Dr. Pedro — Nutrologia | App de Cliente (Rise Agência)

App interno de gestão do cliente Dr. Pedro. Mesmo padrão do app da Gislene: React + Vite + Firestore (projeto `rise-painel`).

## O que tem

- **Briefing** — formulário com todas as perguntas de onboarding, salva na coleção `dr-pedro-nutrologia` (documento `briefing`)
- **Roteiros de Vídeo** — CRUD de roteiros com status (Rascunho / Em aprovação / Aprovado / Gravado)
- **Calendário de Visita** — calendário do mês pra marcar dias de gravação/visita
- **Estratégia** — CRUD de linhas de estratégia

Todos os dados ficam no Firestore, em tempo real (se você e a Lara abrirem ao mesmo tempo, as duas veem as atualizações na hora).

## Rodar localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

## Subir pro GitHub

```bash
git init
git add .
git commit -m "primeira versão do app do Dr. Pedro"
git branch -M main
git remote add origin https://github.com/agenciarisecomercial-ops/dr-pedro-nutrologia.git
git push -u origin main
```
(troque o nome do repo se preferir outro)

## Deploy no Vercel

1. Entra em vercel.com, "Add New Project"
2. Importa o repositório `agenciarisecomercial-ops/dr-pedro-nutrologia`
3. O Vercel detecta Vite automaticamente — não precisa mudar nada nas configurações de build
4. Deploy

## Firebase

A configuração já está embutida em `src/firebase.js`, apontando pro projeto `rise-painel`, coleção `dr-pedro-nutrologia`. Antes de usar em produção, vale conferir no console do Firebase (aba Rules) se a coleção está com permissão de leitura/escrita adequada.

Estrutura de dados no Firestore:
```
dr-pedro-nutrologia/
  briefing                  (documento único com as respostas)
  data/
    roteiros/{id}            (subcoleção)
    visitas/{id}              (subcoleção)
    estrategias/{id}          (subcoleção)
```
