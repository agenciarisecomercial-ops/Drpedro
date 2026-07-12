import React, { useState, useEffect, useCallback } from "react";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db, CLIENT_COLLECTION } from "./firebase";
import {
  FileText,
  Video,
  CalendarDays,
  Compass,
  Plus,
  Trash2,
  Pencil,
  X,
  Save,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

const QUESTION_GROUPS = [
  {
    id: "inst",
    title: "Institucional",
    fields: [
      { id: "nomeProfissional", label: "Nome profissional (como quer ser chamado publicamente)" },
      { id: "crm", label: "CRM (número e estado)" },
      { id: "rqe", label: "RQE, se tiver" },
      { id: "formacao", label: "Formação: faculdade, residência, pós-graduações, cursos" },
      { id: "cnpj", label: "CNPJ da clínica (se pessoa jurídica)" },
      { id: "endereco", label: "Endereço completo do consultório" },
    ],
  },
  {
    id: "esp",
    title: "Especialidade e posicionamento",
    fields: [
      { id: "tiposAtendimento", label: "Principais tipos de atendimento/caso que mais recebe" },
      { id: "nicho", label: "Nicho a priorizar (emagrecimento, esportiva, hormonal, geral...)" },
      { id: "diferencial", label: "Como se diferencia de outros nutrólogos da região" },
      { id: "referencias", label: "Perfis que admira / perfis que não quer se parecer" },
    ],
  },
  {
    id: "paciente",
    title: "Paciente ideal",
    fields: [
      { id: "perfilAtual", label: "Perfil de paciente que mais procura hoje (idade, gênero, motivo)" },
      { id: "perfilDesejado", label: "Perfil de paciente que gostaria de atrair mais" },
      { id: "medoPrincipal", label: "Principal dúvida/medo que o paciente traz na 1ª consulta" },
      { id: "objecaoComum", label: "Objeção mais comum antes de marcar consulta" },
    ],
  },
  {
    id: "servicos",
    title: "Serviços e ticket",
    fields: [
      { id: "servicosOferecidos", label: "Serviços/consultas/exames oferecidos, pacotes ou protocolos próprios" },
      { id: "valorConsulta", label: "Valor da consulta e retornos" },
      { id: "regrasEspecificas", label: "Procedimento com regra específica de divulgação" },
      { id: "capacidadeAgenda", label: "Capacidade real de atendimento por mês" },
    ],
  },
  {
    id: "tom",
    title: "Tom de voz e limites",
    fields: [
      { id: "tomPreferido", label: "Tom sério/institucional ou leve/acessível?" },
      { id: "assuntosEvitar", label: "Assunto que não quer abordar publicamente" },
      { id: "experienciaRuim", label: "Já teve experiência ruim com marketing médico?" },
      { id: "confortoVideo", label: "Confiança em aparecer em vídeo com frequência?" },
    ],
  },
  {
    id: "prova",
    title: "Prova social",
    fields: [
      { id: "depoimentos", label: "Pacientes dispostos a dar depoimento?" },
      { id: "caseSucesso", label: "Caso de sucesso que possa virar conteúdo (respeitando sigilo)" },
    ],
  },
  {
    id: "concorrencia",
    title: "Concorrência",
    fields: [
      { id: "concorrenciaDireta", label: "Outros médicos/clínicas da região como concorrência direta" },
      { id: "analiseComunicacao", label: "O que funciona e o que não funciona na comunicação deles" },
    ],
  },
  {
    id: "compliance",
    title: "Compliance e CFM",
    fields: [
      { id: "conhecimentoCFM", label: "Familiaridade com a Resolução CFM sobre publicidade médica" },
      { id: "restricaoCRM", label: "Restrição adicional do CRM-SP além da norma geral" },
      { id: "fluxoAprovacao", label: "Aprovar roteiro sempre antes de gravar, ou só em temas sensíveis?" },
    ],
  },
  {
    id: "operacao",
    title: "Operação e aprovação",
    fields: [
      { id: "quemAprova", label: "Quem aprova o conteúdo antes de ir ao ar" },
      { id: "prazoAprovacao", label: "Prazo de aprovação sem travar o calendário" },
      { id: "frequenciaGravacao", label: "Gravar tudo de uma vez por mês ou sessões menores?" },
    ],
  },
  {
    id: "metas",
    title: "Metas e orçamento",
    fields: [
      { id: "metaPacientes", label: "Meta de novos pacientes por mês" },
      { id: "verbaTrafico", label: "Orçamento de verba de tráfego separado do fee" },
      { id: "sazonalidade", label: "Sazonalidade no atendimento" },
    ],
  },
];

const STATUS_OPTIONS = ["Rascunho", "Em aprovação", "Aprovado", "Gravado"];
const STATUS_STYLES = {
  Rascunho: "bg-stone-200 text-stone-700",
  "Em aprovação": "bg-amber-100 text-amber-800",
  Aprovado: "bg-teal-100 text-teal-800",
  Gravado: "bg-teal-800 text-white",
};

const TABS = [
  { id: "briefing", label: "Briefing", sub: "Ficha de anamnese do cliente", icon: FileText },
  { id: "roteiros", label: "Roteiros de Vídeo", sub: "Banco de roteiros", icon: Video },
  { id: "calendario", label: "Calendário de Visita", sub: "Agenda de gravações", icon: CalendarDays },
  { id: "estrategia", label: "Estratégia", sub: "Linhas de ação", icon: Compass },
];

// dr-pedro-nutrologia (briefing)              -> documento único
// dr-pedro-nutrologia/data/roteiros/{id}       -> subcoleção
// dr-pedro-nutrologia/data/visitas/{id}        -> subcoleção
// dr-pedro-nutrologia/data/estrategias/{id}    -> subcoleção
function subcollectionRef(name) {
  return collection(db, CLIENT_COLLECTION, "data", name);
}

function useFirestoreList(name) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(subcollectionRef(name), orderBy("criadoEm", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setItems(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [name]);

  const addItem = useCallback(
    async (data) => {
      await addDoc(subcollectionRef(name), { ...data, criadoEm: Date.now() });
    },
    [name]
  );

  const updateItem = useCallback(
    async (id, data) => {
      await updateDoc(doc(db, CLIENT_COLLECTION, "data", name, id), data);
    },
    [name]
  );

  const deleteItem = useCallback(
    async (id) => {
      await deleteDoc(doc(db, CLIENT_COLLECTION, "data", name, id));
    },
    [name]
  );

  return { items, loading, error, addItem, updateItem, deleteItem };
}

function SectionHeader({ icon: Icon, title, sub }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div className="mt-1 rounded-lg bg-teal-800 p-2 text-white">
        <Icon size={18} />
      </div>
      <div>
        <h2
          className="text-2xl text-stone-900"
          style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, letterSpacing: "-0.01em" }}
        >
          {title}
        </h2>
        <p className="text-sm text-stone-500">{sub}</p>
      </div>
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      Não consegui falar com o Firestore agora: {message}. Confira as Regras (Rules) da coleção
      dr-pedro-nutrologia no console do Firebase.
    </div>
  );
}

function BriefingTab() {
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, CLIENT_COLLECTION, "briefing"));
        if (active) setAnswers(snap.exists() ? snap.data() : {});
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleChange = (id, value) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    setStatus("saving");
    try {
      await setDoc(doc(db, CLIENT_COLLECTION, "briefing"), answers, { merge: true });
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-stone-500">
        <Loader2 size={16} className="animate-spin" /> Carregando briefing...
      </div>
    );
  }

  return (
    <div>
      <SectionHeader icon={FileText} title="Briefing" sub="Preencha durante ou depois da reunião com o Dr. Pedro" />
      <ErrorBanner message={error} />
      <div className="space-y-8">
        {QUESTION_GROUPS.map((group) => (
          <div key={group.id} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3
              className="mb-4 text-sm uppercase tracking-wide text-teal-800"
              style={{ fontFamily: "Syne, sans-serif", fontWeight: 700 }}
            >
              {group.title}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {group.fields.map((f) => (
                <div key={f.id} className="flex flex-col gap-1">
                  <label className="text-xs text-stone-500">{f.label}</label>
                  <textarea
                    rows={2}
                    value={answers[f.id] || ""}
                    onChange={(e) => handleChange(f.id, e.target.value)}
                    className="rounded-lg border border-stone-300 bg-stone-50 p-2 text-sm text-stone-800 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/30"
                    placeholder="Resposta..."
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-4 mt-6 flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-medium text-white shadow-md hover:bg-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-700/50"
        >
          {status === "saving" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {status === "saved" ? "Briefing salvo" : "Salvar briefing"}
        </button>
      </div>
    </div>
  );
}

function EntryForm({ initial, onCancel, onSubmit, withStatus }) {
  const [titulo, setTitulo] = useState(initial?.titulo || "");
  const [conteudo, setConteudo] = useState(initial?.conteudo || "");
  const [statusValue, setStatusValue] = useState(initial?.status || STATUS_OPTIONS[0]);
  const [saving, setSaving] = useState(false);

  return (
    <div className="rounded-xl border border-teal-700/40 bg-teal-50/40 p-5">
      <div className="mb-3 flex flex-col gap-1">
        <label className="text-xs text-stone-500">Título</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="rounded-lg border border-stone-300 bg-white p-2 text-sm focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/30"
          placeholder="Ex: Já tentei de tudo e nada funciona"
        />
      </div>
      {withStatus && (
        <div className="mb-3 flex flex-col gap-1">
          <label className="text-xs text-stone-500">Status</label>
          <select
            value={statusValue}
            onChange={(e) => setStatusValue(e.target.value)}
            className="w-fit rounded-lg border border-stone-300 bg-white p-2 text-sm focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/30"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="mb-4 flex flex-col gap-1">
        <label className="text-xs text-stone-500">Conteúdo</label>
        <textarea
          rows={6}
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          className="rounded-lg border border-stone-300 bg-white p-2 text-sm focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/30"
          placeholder="Escreva o texto aqui..."
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400"
        >
          Cancelar
        </button>
        <button
          disabled={saving}
          onClick={async () => {
            if (!titulo.trim()) return;
            setSaving(true);
            await onSubmit({ titulo, conteudo, status: statusValue });
            setSaving(false);
          }}
          className="flex items-center gap-2 rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-700/50 disabled:opacity-60"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          Salvar
        </button>
      </div>
    </div>
  );
}

function ListTab({ icon, title, sub, storageName, withStatus, addLabel, emptyLabel }) {
  const { items, loading, error, addItem, updateItem, deleteItem } = useFirestoreList(storageName);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <SectionHeader icon={icon} title={title} sub={sub} />
        {!formOpen && (
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-700/50"
          >
            <Plus size={16} /> {addLabel}
          </button>
        )}
      </div>

      <ErrorBanner message={error} />

      {formOpen && (
        <div className="mb-6">
          <EntryForm
            withStatus={withStatus}
            onCancel={() => setFormOpen(false)}
            onSubmit={async (data) => {
              await addItem(data);
              setFormOpen(false);
            }}
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-stone-500">
          <Loader2 size={16} className="animate-spin" /> Carregando...
        </div>
      ) : items.length === 0 && !formOpen ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-sm text-stone-500">
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) =>
            editingId === item.id ? (
              <EntryForm
                key={item.id}
                initial={item}
                withStatus={withStatus}
                onCancel={() => setEditingId(null)}
                onSubmit={async (data) => {
                  await updateItem(item.id, data);
                  setEditingId(null);
                }}
              />
            ) : (
              <div key={item.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-medium text-stone-900">{item.titulo}</h4>
                      {withStatus && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[item.status]}`}>
                          {item.status}
                        </span>
                      )}
                    </div>
                    <p className={`mt-1 text-sm text-stone-500 ${expandedId === item.id ? "" : "line-clamp-2"}`}>
                      {item.conteudo || "Sem conteúdo ainda."}
                    </p>
                  </button>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => setEditingId(item.id)}
                      aria-label="Editar"
                      className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      aria-label="Excluir"
                      className="rounded-lg p-2 text-stone-500 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function CalendarioTab() {
  const { items: visitas, loading, error, addItem, deleteItem } = useFirestoreList("visitas");
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [note, setNote] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = new Date().toISOString().slice(0, 10);

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dateKey = (d) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const visitasByDay = visitas.reduce((acc, v) => {
    acc[v.date] = acc[v.date] || [];
    acc[v.date].push(v);
    return acc;
  }, {});

  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const addVisita = async () => {
    if (!selectedDate || !note.trim()) return;
    setSaving(true);
    await addItem({ date: selectedDate, time, note });
    setNote("");
    setTime("");
    setSaving(false);
  };

  const upcoming = [...visitas]
    .filter((v) => v.date >= todayKey)
    .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));

  return (
    <div>
      <SectionHeader icon={CalendarDays} title="Calendário de Visita" sub="Marque os dias de gravação e visita ao consultório" />
      <ErrorBanner message={error} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              className="rounded-lg p-2 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <h3 className="text-lg capitalize text-stone-800" style={{ fontFamily: "Syne, sans-serif", fontWeight: 700 }}>
              {monthLabel}
            </h3>
            <button
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="rounded-lg p-2 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400"
              aria-label="Próximo mês"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-stone-400">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
              <div key={i} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const key = dateKey(d);
              const hasVisit = visitasByDay[key]?.length > 0;
              const isToday = key === todayKey;
              const isSelected = key === selectedDate;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(key)}
                  className={`relative aspect-square rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-700/50 ${
                    isSelected
                      ? "bg-teal-800 text-white"
                      : isToday
                      ? "border border-teal-700 text-teal-800"
                      : "hover:bg-stone-100 text-stone-700"
                  }`}
                >
                  {d}
                  {hasVisit && (
                    <span
                      className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                        isSelected ? "bg-white" : "bg-amber-500"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4">
              <p className="mb-2 text-sm font-medium text-stone-700">
                Nova visita em {selectedDate.split("-").reverse().join("/")}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="rounded-lg border border-stone-300 bg-white p-2 text-sm focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/30"
                />
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex: Gravação de 4 vídeos essenciais"
                  className="flex-1 rounded-lg border border-stone-300 bg-white p-2 text-sm focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/30"
                />
                <button
                  disabled={saving}
                  onClick={addVisita}
                  className="flex items-center justify-center gap-2 rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-700/50 disabled:opacity-60"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Adicionar
                </button>
              </div>
              {visitasByDay[selectedDate]?.map((v) => (
                <div key={v.id} className="mt-2 flex items-center justify-between rounded-lg bg-white p-2 text-sm">
                  <span>
                    {v.time && <span className="font-medium text-teal-800">{v.time} · </span>}
                    {v.note}
                  </span>
                  <button
                    onClick={() => deleteItem(v.id)}
                    className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remover visita"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm uppercase tracking-wide text-teal-800" style={{ fontFamily: "Syne, sans-serif", fontWeight: 700 }}>
            Próximas visitas
          </h3>
          {loading ? (
            <div className="flex items-center gap-2 text-stone-500">
              <Loader2 size={16} className="animate-spin" /> Carregando...
            </div>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-stone-500">Nenhuma visita marcada ainda. Clique num dia no calendário para adicionar.</p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((v) => (
                <li key={v.id} className="rounded-lg border border-stone-100 bg-stone-50 p-3 text-sm">
                  <p className="font-medium text-stone-800">{v.date.split("-").reverse().join("/")}</p>
                  <p className="text-stone-500">
                    {v.time && `${v.time} · `}
                    {v.note}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("briefing");

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800">
      <div className="border-b border-stone-200 bg-white px-6 py-4">
        <p className="text-xs uppercase tracking-wide text-stone-400">Rise Agência · Ficha de cliente</p>
        <h1 className="text-xl text-stone-900" style={{ fontFamily: "Syne, sans-serif", fontWeight: 800 }}>
          Dr. Pedro — Nutrologia
        </h1>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:flex-row md:p-6">
        <nav className="flex gap-2 overflow-x-auto md:w-64 md:flex-col md:overflow-visible">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-3 rounded-lg border-l-4 px-4 py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/50 md:shrink ${
                  active
                    ? "border-teal-800 bg-white shadow-sm"
                    : "border-transparent bg-stone-50 hover:bg-white"
                }`}
              >
                <Icon size={18} className={active ? "text-teal-800" : "text-stone-400"} />
                <span>
                  <span className={`block text-sm font-medium ${active ? "text-stone-900" : "text-stone-600"}`}>
                    {tab.label}
                  </span>
                  <span className="hidden text-xs text-stone-400 md:block">{tab.sub}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <main className="flex-1 pb-16">
          {activeTab === "briefing" && <BriefingTab />}
          {activeTab === "roteiros" && (
            <ListTab
              icon={Video}
              title="Roteiros de Vídeo"
              sub="Adicione os roteiros conforme forem escritos"
              storageName="roteiros"
              withStatus
              addLabel="Novo roteiro"
              emptyLabel="Nenhum roteiro ainda. Adicione o primeiro roteiro de vídeo."
            />
          )}
          {activeTab === "calendario" && <CalendarioTab />}
          {activeTab === "estrategia" && (
            <ListTab
              icon={Compass}
              title="Estratégia"
              sub="Linhas de estratégia definidas para o cliente"
              storageName="estrategias"
              addLabel="Nova estratégia"
              emptyLabel="Nenhuma estratégia registrada ainda. Adicione a primeira linha de ação."
            />
          )}
        </main>
      </div>
    </div>
  );
}
