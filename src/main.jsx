import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Mesmo projeto Firebase usado no painel da Rise e no app da Gislene.
// Essa config é pública por natureza (protegida pelas Regras do Firestore,
// não por estar escondida) — é seguro deixar embutida no código do front-end.
const firebaseConfig = {
  apiKey: "AIzaSyAjLQDcJFbPcuVXKgxdzT2umo-PKEnKsU0",
  authDomain: "rise-painel.firebaseapp.com",
  projectId: "rise-painel",
  storageBucket: "rise-painel.firebasestorage.app",
  messagingSenderId: "262140796838",
  appId: "1:262140796838:web:f38ab03c219d286348f967",
  measurementId: "G-L07EZLJV6K",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Coleção dedicada a este cliente dentro do projeto rise-painel.
export const CLIENT_COLLECTION = "dr-pedro-nutrologia";
