// engine.js
export function detectIntent(text) {
  const t = (text || "").toLowerCase();

  const score = {
    email: 0,
    image: 0,
    summarize: 0,
    rewrite: 0,
    coding: 0,
    brainstorm: 0,
    plan: 0,
    other: 0
  };

  // email
  if (/(mail|email|objet|bonjour|cordialement|madame|monsieur|candidature|stage|alternance)/.test(t)) score.email += 3;
  if (/(réponds|réponse|relance|sujet|signature)/.test(t)) score.email += 2;

  // image
  if (/(image|photo|illustration|dessin|génère une image|render|style|cinématique|prompt)/.test(t)) score.image += 3;

  // summarize
  if (/(résume|résumé|synthèse|tl;dr|points clés|key points)/.test(t)) score.summarize += 3;

  // rewrite
  if (/(reformule|corrige|améliore|orthographe|style|plus pro|plus humain)/.test(t)) score.rewrite += 3;

  // coding
  if (/(code|bug|javascript|python|typescript|api|erreur|stack|fonction|regex)/.test(t)) score.coding += 3;

  // brainstorm
  if (/(idées|brainstorm|propose|options|variantes|noms|concept)/.test(t)) score.brainstorm += 2;

  // plan
  if (/(plan|roadmap|étapes|timeline|gantt|wbs|stratégie)/.test(t)) score.plan += 2;

  // Pick best
  let best = "other";
  let bestScore = -1;
  for (const k of Object.keys(score)) {
    if (score[k] > bestScore) {
      best = k;
      bestScore = score[k];
    }
  }

  // confidence
  const confidence = Math.min(1, bestScore / 4);
  return { intent: best, confidence };
}

function baseGuidanceForIntent(intent) {
  switch (intent) {
    case "email":
      return {
        role: "Assistant de rédaction professionnelle",
        task: "Rédige un email clair et professionnel à partir du brouillon ci-dessous.",
        format: "Donne : 1) Objet, 2) Email, 3) 2 variantes (plus direct / plus chaleureux).",
        extras: "Pose 1 question si une info manque."
      };
    case "image":
      return {
        role: "Prompt engineer pour génération d’images",
        task: "Transforme l’idée ci-dessous en prompt d’image détaillé.",
        format: "Donne : prompt principal + negative prompt + 3 variantes.",
        extras: "Précise style, lumière, composition, cadrage, rendu."
      };
    case "summarize":
      return {
        role: "Assistant de synthèse",
        task: "Résume le contenu ci-dessous.",
        format: "Donne : 5 bullets + 1 phrase de conclusion + actions si applicable.",
        extras: "Ne pas inventer."
      };
    case "coding":
      return {
        role: "Assistant développeur",
        task: "Aide à résoudre le problème décrit ci-dessous.",
        format: "Donne : diagnostic, étapes, code minimal, puis tests.",
        extras: "Si ambigu, liste les infos manquantes."
      };
    default:
      return {
        role: "Assistant",
        task: "Aide sur la demande ci-dessous.",
        format: "Réponse structurée en sections, concise.",
        extras: "Demande les infos manquantes si nécessaire."
      };
  }
}

export function buildSuggestion(framework, userText, meta = {}) {
  const { intent } = meta;
  const g = baseGuidanceForIntent(intent);

  const inputBlock = `Brouillon utilisateur:\n"""\n${userText}\n"""`;

  if (framework === "RTF") {
    return [
      `Rôle: ${g.role}`,
      `Tâche: ${g.task}`,
      `Format: ${g.format}`,
      `Contraintes: ${g.extras}`,
      "",
      inputBlock
    ].join("\n");
  }

  if (framework === "CRAFT") {
    return [
      `Contexte: Tu aides l’utilisateur selon l’intention "${intent}".`,
      `Rôle: ${g.role}`,
      `Action: ${g.task} Ajoute les détails utiles sans inventer.`,
      `Format: ${g.format}`,
      `Tonalité: claire, naturelle, professionnelle.`,
      `Contraintes: ${g.extras}`,
      "",
      inputBlock
    ].join("\n");
  }

  if (framework === "CLEAR") {
    return [
      `Contexte: Intention détectée = "${intent}".`,
      `Logique: Structure ta réponse en étapes. Si infos manquantes, commence par 3 questions max.`,
      `Exemples: Donne 1 mini-exemple de formulation (si pertinent).`,
      `Attentes: ${g.format}`,
      `Restrictions: ${g.extras}. Pas d’hallucinations.`,
      "",
      inputBlock
    ].join("\n");
  }

  return userText;
}

export function getSuggestions(userText) {
  const meta = detectIntent(userText);
  const frameworks = ["RTF", "CRAFT", "CLEAR"];
  const suggestions = frameworks.map((fw) => ({
    id: fw,
    title: fw,
    intent: meta.intent,
    confidence: meta.confidence,
    prompt: buildSuggestion(fw, userText, meta)
  }));
  return { meta, suggestions };
}
