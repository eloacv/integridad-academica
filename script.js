(() => {
  "use strict";

  const FORM_EMBED_URL = "https://docs.google.com/forms/d/e/1FAIpQLSflMtxX1Ez6wdgO7AFJKkfVghx-CT4uWWisQrmIp4wbhwprbg/viewform?embedded=true"; // Pega aquí la URL embed de Google Forms (termina normalmente en /viewform?embedded=true)
  const state = {
    currentScreen: 1,
    score: 0,
    scored: { dilemma: false, myths: false, stories: [false, false, false] },
    mythsCorrect: 0,
    mythsDone: 0,
    storyIndex: 0,
    sortSelected: null,
    sortDone: 0
  };

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const screens = [...document.querySelectorAll(".screen")];
  const progressText = document.getElementById("progress-text");
  const progressBar = document.getElementById("progress-bar");

  // Motor narrativo de Nova: se inicializa antes de renderizar las escenas.
  const makeNova = (id, ui = {}) => {
    const element = document.getElementById(id);
    return element ? new NovaEngine(element, ui) : null;
  };
  const heroNova = makeNova("nova-hero", {
    speech: document.getElementById("hero-speech"),
    speechTitle: document.getElementById("hero-speech-title"),
    speechText: document.getElementById("hero-speech-text")
  });
  const dilemmaNovaEngine = makeNova("nova-dilemma");
  const mythNovaEngine = makeNova("nova-myths");
  const storyNovaEngine = makeNova("nova-story");
  const futureNovaEngine = makeNova("nova-future");
  const aiNovaEngine = makeNova("nova-ai");
  const finalNovaEngine = makeNova("nova-final");
  window.novaScenes = { 1: heroNova, 2: dilemmaNovaEngine, 4: mythNovaEngine, 5: storyNovaEngine, 6: futureNovaEngine, 7: aiNovaEngine, 8: finalNovaEngine };

  function playHeroIntro() {
    if (!heroNova) return;
    heroNova.hideSpeech();
    setTimeout(() => heroNova.enter(), 180);
    setTimeout(() => heroNova.say(
      "¡Hola! Soy Nova.",
      "Voy contigo en este recorrido. No buscamos respuestas perfectas. Solo entender qué hay detrás de cada decisión."
    ), 1480);
  }

  function showScreen(number) {
    const next = document.querySelector(`[data-screen="${number}"]`);
    if (!next) return;
    screens.forEach(s => s.classList.toggle("is-active", s === next));
    state.currentScreen = number;
    document.body.classList.remove("allow-page-scroll");
    if (number !== 8) document.getElementById("form-section")?.setAttribute("hidden", "");
    progressText.textContent = `NIVEL ${number} / 8`;
    progressBar.querySelectorAll(".seg").forEach((seg, i) => {
      seg.classList.toggle("filled", i < number);
      seg.classList.toggle("current", i === number - 1);
    });
    if (window.novaScenes?.[number]) {
      const sceneNova = window.novaScenes[number];
      sceneNova.enter();
      if (number === 1) {
        setTimeout(() => sceneNova.say(
          "¡Hola! Soy Nova.",
          "Voy contigo en este recorrido. No buscamos respuestas perfectas. Solo entender qué hay detrás de cada decisión."
        ), 1480);
      } else {
        setTimeout(() => sceneNova.idle(), 1350);
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    next.querySelector("h1,h2")?.focus?.({ preventScroll: true });
    if (number === 6) { initRevealObserver(); playFutureScene(); }
    if (number === 7) { resetAiReaction(); }
    if (number === 8) { renderFinalScore(); setTimeout(() => finalNovaEngine?.celebrate(), 900); }
  }

  document.addEventListener("click", (event) => {
    const nextButton = event.target.closest("[data-next]");
    if (nextButton && !nextButton.disabled) showScreen(Number(nextButton.dataset.next));
  });

  document.getElementById("brand-home")?.addEventListener("click", (event) => {
    event.preventDefault();
    window.location.reload();
});

  // Pantalla 2
  const dilemmaFeedback = {
    a: {
      text: "Terminaste la tarea… pero el aprendizaje quedó pendiente. No estoy aquí para juzgarte. Solo quiero dejarte una pregunta: ¿qué profesional quieres construir desde hoy?",
      mood: "worried"
    },
    b: {
      text: "Entregaste un trabajo. Pero ¿representa lo que realmente sabes? Pensemos un momento en eso.",
      mood: "think"
    },
    c: {
      text: "Aquí la IA fue una herramienta. El aprendizaje siguió siendo tuyo. Esa diferencia importa mucho.",
      mood: "happy"
    },
    d: {
      text: "A veces un trabajo imperfecto también puede ser un trabajo honesto. Y eso dice mucho de quien lo hizo.",
      mood: "happy"
    }
  };

  let pendingDilemmaChoice = null;
  const dilemmaButtons = [...document.querySelectorAll("#dilemma-options .choice-card")];
  const dilemmaBubble = document.getElementById("dilemma-nova");
  const dilemmaNext = document.getElementById("dilemma-next");

  dilemmaButtons.forEach(button => {
    button.addEventListener("click", () => {
      if (state.scored.dilemma) return;

      pendingDilemmaChoice = button;
      dilemmaButtons.forEach(choice => {
        const selected = choice === button;
        choice.classList.toggle("is-selected", selected);
        choice.setAttribute("aria-pressed", String(selected));
      });

      const feedback = dilemmaFeedback[button.dataset.feedback];
      dilemmaBubble.classList.remove("is-changing");
      void dilemmaBubble.offsetWidth;
      dilemmaBubble.classList.add("is-changing");
      dilemmaBubble.textContent = feedback.text;
      dilemmaNext.hidden = false;

      if (dilemmaNovaEngine) {
        if (feedback.mood === "happy") dilemmaNovaEngine.happy();
        else if (feedback.mood === "worried") dilemmaNovaEngine.worried();
        else dilemmaNovaEngine.think();
      }
    });
  });

  dilemmaNext.addEventListener("click", () => {
    if (!pendingDilemmaChoice || state.scored.dilemma) return;
    state.scored.dilemma = true;
    state.score += Number(pendingDilemmaChoice.dataset.score);
    dilemmaButtons.forEach(button => button.disabled = true);
    showScreen(3);
  });

  // Pantalla 3
  const flipped = new Set();
  const valueCards = [...document.querySelectorAll("#values-grid .flip-card")];
  const valueDots = [...document.querySelectorAll("#values-dots i")];
  const valuesCounter = document.getElementById("values-counter");
  const valuesComplete = document.getElementById("values-complete");

  valueCards.forEach((card, index) => {
    card.addEventListener("click", () => {
      const wasDiscovered = flipped.has(index);
      card.classList.toggle("is-flipped");
      const isFlipped = card.classList.contains("is-flipped");
      card.setAttribute("aria-pressed", String(isFlipped));

      if (isFlipped && !wasDiscovered) {
        flipped.add(index);
        card.classList.add("is-discovered");
        valueDots[index]?.classList.add("is-on");
      }

      valuesCounter.textContent = `${flipped.size} / 6`;
      document.getElementById("values-dots")?.setAttribute("aria-label", `${flipped.size} de 6 valores descubiertos`);

      if (flipped.size === 6 && valuesComplete.hidden) {
        valuesComplete.hidden = false;
        valuesComplete.closest(".values-heading")?.classList.add("is-complete");
        valuesComplete.classList.add("is-visible");
        const novaValues = document.getElementById("nova-values");
        if (window.NovaEngine && novaValues) {
          const valuesEngine = new window.NovaEngine(novaValues);
          valuesEngine.celebrate();
        }
        // Nova aparece como acompañante lateral; no desplazamos la pantalla.
      }
    });
  });

  // Pantalla 4
  const myths = [
    {
      statement: "“Si cambio algunas palabras, ya no es plagio”.",
      answer: "mito",
      explanation: "Las palabras pueden cambiar, pero la idea sigue siendo de otra persona. Parafrasear también requiere reconocer la fuente.",
      novaCorrect: "Bien visto. Cambiar las palabras no cambia el origen de la idea.",
      novaIncorrect: "Es una creencia común. Cambiar las palabras no basta: la idea todavía necesita ser reconocida."
    },
    {
      statement: "“Si la IA lo escribió todo, el trabajo ya es mío”.",
      answer: "mito",
      explanation: "Que una IA genere el texto no convierte automáticamente el trabajo en propio. Puede ayudarte a pensar, pero no reemplazar tu proceso.",
      novaCorrect: "Exacto. La herramienta puede acompañarte, pero el aprendizaje tiene que seguir siendo tuyo.",
      novaIncorrect: "Puede sentirse propio porque tú diste la instrucción, pero el resultado no demuestra necesariamente lo que sabes."
    },
    {
      statement: "“Prestar mi tarea no afecta a nadie”.",
      answer: "mito",
      explanation: "Ayudar no es lo mismo que permitir que otra persona presente tu trabajo como suyo. Esa decisión puede comprometer a ambos.",
      novaCorrect: "Así es. Compartir para explicar ayuda; compartir para que copien cambia por completo la situación.",
      novaIncorrect: "La intención puede ser ayudar, pero si alguien presenta tu trabajo como propio, los dos pueden verse afectados."
    },
    {
      statement: "“Usar IA durante una evaluación no es tan grave”.",
      answer: "mito",
      explanation: "Si la herramienta no está autorizada, su uso altera las reglas de la evaluación y deja de mostrar lo que tú puedes hacer.",
      novaCorrect: "Bien visto. En una evaluación importan las reglas y que la respuesta refleje lo que tú sabes hacer.",
      novaIncorrect: "Depende de las reglas. Si la IA no está autorizada, usarla cambia las condiciones para todos."
    }
  ];

  let mythIndex = 0;
  let currentMythAnswered = false;
  const mythQuestion = document.getElementById("myth-question");
  const mythStep = document.getElementById("myth-step");
  const mythActions = document.getElementById("myth-actions");
  const mythExplanation = document.getElementById("myth-explanation");
  const mythSpeech = document.getElementById("myth-nova-speech");
  const mythNext = document.getElementById("myth-next");
  const mythProgressText = document.getElementById("myth-progress-text");
  const mythDots = [...document.querySelectorAll("#myth-progress-dots i")];
  const mythNovaStage = document.querySelector(".myths-nova-stage");

  function renderMyth() {
    const myth = myths[mythIndex];
    currentMythAnswered = false;
    mythStep.textContent = `MITO ${mythIndex + 1} DE ${myths.length}`;
    mythQuestion.textContent = myth.statement;
    mythExplanation.hidden = true;
    mythExplanation.textContent = "";
    mythNext.hidden = true;
    mythActions.querySelectorAll("button").forEach(button => {
      button.disabled = false;
      button.classList.remove("is-selected", "is-correct", "is-incorrect");
    });
    mythSpeech.textContent = "¿Verdad o mito? Elige una opción y miremos qué hay detrás.";
    mythNovaStage?.classList.remove("is-correct", "is-incorrect");
    mythNovaEngine?.think();
  }

  mythActions?.querySelectorAll("[data-myth-pick]").forEach(button => {
    button.addEventListener("click", () => {
      if (currentMythAnswered) return;
      currentMythAnswered = true;
      const myth = myths[mythIndex];
      const choice = button.dataset.mythPick;
      const correct = choice === myth.answer;

      mythActions.querySelectorAll("button").forEach(choiceButton => {
        choiceButton.disabled = true;
        choiceButton.classList.toggle("is-selected", choiceButton === button);
      });
      button.classList.add(correct ? "is-correct" : "is-incorrect");

      mythExplanation.innerHTML = `<strong>${myth.answer.toUpperCase()}.</strong> ${myth.explanation}`;
      mythExplanation.hidden = false;
      mythSpeech.textContent = correct ? myth.novaCorrect : myth.novaIncorrect;

      mythNovaStage?.classList.remove("is-correct", "is-incorrect");
      if (correct) {
        state.mythsCorrect += 1;
        mythNovaStage?.classList.add("is-correct");
        mythNovaEngine?.celebrate();
      } else {
        mythNovaStage?.classList.add("is-incorrect");
        mythNovaEngine?.worried();
      }

      state.mythsDone += 1;
      mythProgressText.textContent = `${state.mythsDone} / ${myths.length}`;
      mythDots[mythIndex]?.classList.add("is-complete");
      mythNext.hidden = false;
      mythNext.innerHTML = mythIndex === myths.length - 1
        ? 'CONTINUAR <span aria-hidden="true">▸</span>'
        : 'SIGUIENTE MITO <span aria-hidden="true">▸</span>';

      if (mythIndex === myths.length - 1) {
        // Al terminar, conservamos la reacción correspondiente a la respuesta elegida.
        // Una respuesta incorrecta no debe transformarse inmediatamente en celebración.
        mythSpeech.textContent = correct
          ? "Bien visto. Ya resolviste los cuatro mitos."
          : `${myth.novaIncorrect} Ya completaste los cuatro mitos.`;
      }
    });
  });

  mythNext?.addEventListener("click", () => {
    if (!currentMythAnswered) return;
    if (mythIndex < myths.length - 1) {
      mythIndex += 1;
      renderMyth();
      return;
    }
    if (!state.scored.myths) {
      state.scored.myths = true;
      state.score += state.mythsCorrect * 5;
    }
    showScreen(5);
  });

  renderMyth();

  // Pantalla 5
  const stories = [
    {
      person: "ANA · 1/3",
      title: "No durmió y piensa copiar un trabajo entero.",
      quote: "“Es solo uno. No le hago daño a nadie”.",
      options: [
        { label: "COPIAR", points: 2, outcome: "Puede parecer solo un trabajo. Pero las decisiones pequeñas también construyen tu forma de actuar.", nova: "Una decisión pequeña también deja huella." },
        { label: "ENTREGAR MENOS, PERO MÍO", points: 20, outcome: "Quizá sea menos vistoso, pero es real. Nadie puede quitarle lo que sí aprendió.", nova: "Lo real también vale." }
      ]
    },
    {
      person: "LUIS · 2/3",
      title: "Le pide a la IA que haga todo el trabajo.",
      quote: "“Nadie se va a enterar”.",
      options: [
        { label: "ENTREGAR LO DE LA IA", points: 3, outcome: "Puede que nadie se entere. Pero él sí sabe que el trabajo no muestra lo que puede hacer.", nova: "La honestidad no depende de que te descubran." },
        { label: "USARLA COMO APOYO", points: 20, outcome: "Ahí está la diferencia: la IA le ayuda a pensar, pero no piensa por él.", nova: "Herramienta, no reemplazo." }
      ]
    },
    {
      person: "MARÍA · 3/3",
      title: "Le faltan datos en su encuesta y piensa inventar cifras.",
      quote: "“Solo necesito que se vea completo”.",
      options: [
        { label: "INVENTAR LOS DATOS", points: 2, outcome: "Hoy es una cifra de clase. Mañana podría ser un informe que otras personas usen para decidir.", nova: "Los datos también necesitan honestidad." },
        { label: "DECIR QUE FALTÓ TIEMPO", points: 20, outcome: "Cuesta admitirlo, pero la integridad se construye así: una decisión pequeña a la vez.", nova: "Decir la verdad también es avanzar." }
      ]
    }
  ];

  const storyNovaStage = document.querySelector(".story-nova-stage");

  function renderStory() {
    const story = stories[state.storyIndex];
    const person = document.getElementById("story-person");
    const title = document.getElementById("story-title");
    const quote = document.getElementById("story-quote");
    const next = document.getElementById("story-next");
    const speech = document.getElementById("story-nova");
    const actions = document.getElementById("story-actions");

    person.textContent = story.person;
    title.textContent = story.title;
    quote.textContent = story.quote;
    next.hidden = true;
    actions.innerHTML = "";
    speech.textContent = state.storyIndex === 0
      ? "Tres historias. Piensa en lo que deja cada decisión."
      : "Nueva historia. Lee la situación y elige con calma.";
    storyNovaStage?.classList.remove("is-correct", "is-incorrect");
    storyNovaEngine?.think();

    story.options.forEach(option => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "story-choice";
      button.innerHTML = `<span>${option.label}</span>`;
      button.addEventListener("click", () => chooseStory(option, button));
      actions.appendChild(button);
    });

    document.querySelectorAll(".story-progress span").forEach((dot, i) => {
      dot.classList.toggle("active", i <= state.storyIndex);
    });
  }

  function chooseStory(option, selectedButton) {
    if (state.scored.stories[state.storyIndex]) return;
    state.scored.stories[state.storyIndex] = true;
    state.score += option.points;

    document.querySelectorAll("#story-actions button").forEach(button => {
      button.disabled = true;
      button.classList.toggle("is-selected", button === selectedButton);
    });

    const integralChoice = option.points >= 15;
    selectedButton.classList.add(integralChoice ? "is-integral" : "is-risky");
    document.getElementById("story-nova").textContent = `${option.nova} ${option.outcome}`;

    storyNovaStage?.classList.remove("is-correct", "is-incorrect");
    if (storyNovaEngine) {
      if (integralChoice) {
        storyNovaStage?.classList.add("is-correct");
        storyNovaEngine.celebrate();
      } else {
        storyNovaStage?.classList.add("is-incorrect");
        storyNovaEngine.worried();
      }
    }

    const next = document.getElementById("story-next");
    next.hidden = false;
    next.innerHTML = state.storyIndex === 2
      ? 'VER LAS CONSECUENCIAS <span aria-hidden="true">▸</span>'
      : 'SIGUIENTE HISTORIA <span aria-hidden="true">▸</span>';
  }

  document.getElementById("story-next").addEventListener("click", () => {
    if (state.storyIndex < 2) {
      state.storyIndex += 1;
      renderStory();
    } else {
      showScreen(6);
    }
  });
  renderStory();

  // Pantalla 6
  let futureTimer;
  function playFutureScene() {
    const scene = document.getElementById("time-jump");
    const speech = document.getElementById("future-nova-speech");
    if (!scene) return;
    clearTimeout(futureTimer);
    scene.classList.remove("is-time-advanced");
    if (speech) speech.textContent = "La tarea quedó atrás. La decisión, no.";
    futureTimer = setTimeout(() => {
      futureNovaEngine?.think();
      setTimeout(() => {
        scene.classList.add("is-time-advanced");
        futureNovaEngine?.happy();
      }, 650);
    }, 900);
  }

  let revealObserver;
  function initRevealObserver() {
    if (revealObserver) revealObserver.disconnect();
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add("is-visible"), index * 90);
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: .16 });
    document.querySelectorAll(".reveal-on-view").forEach(el => revealObserver.observe(el));
  }

  // Pantalla 7
  const pool = document.getElementById("example-pool");
  const sortFeedback = document.getElementById("sort-feedback");
  const sortProgress = document.getElementById("sort-progress");
  const sortNext = document.getElementById("sort-next");
  const aiNovaStage = document.querySelector(".ai-nova-stage");

  function resetAiReaction() {
    aiNovaStage?.classList.remove("is-correct", "is-incorrect", "is-complete");
    if (state.sortDone === 0 && sortFeedback) {
      sortFeedback.innerHTML = "<strong>Yo también soy IA.</strong><br>La mejor versión de una herramienta aparece cuando trabaja contigo, no cuando piensa en tu lugar.";
    }
  }

  pool?.addEventListener("click", event => {
    const chip = event.target.closest(".example-chip");
    if (!chip) return;
    document.querySelectorAll(".example-chip").forEach(c => c.classList.remove("is-selected"));
    chip.classList.add("is-selected");
    state.sortSelected = chip;
    sortFeedback.textContent = "Ahora elige dónde va esta situación.";
    aiNovaStage?.classList.remove("is-correct", "is-incorrect");
    aiNovaEngine?.think();
  });

  document.querySelectorAll(".sort-bin").forEach(bin => {
    bin.addEventListener("click", () => {
      const chip = state.sortSelected;
      if (!chip) {
        sortFeedback.textContent = "Primero selecciona una situación.";
        aiNovaStage?.classList.add("is-incorrect");
        aiNovaEngine?.worried();
        return;
      }

      aiNovaStage?.classList.remove("is-correct", "is-incorrect");
      if (chip.dataset.type !== bin.dataset.bin) {
        sortFeedback.textContent = "Miremos otra vez: ¿te ayuda a construir aprendizaje o produce la respuesta por ti?";
        aiNovaStage?.classList.add("is-incorrect");
        aiNovaEngine?.worried();
        bin.animate([{ transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "none" }], { duration: 250 });
        return;
      }

      const item = document.createElement("em");
      item.textContent = chip.textContent;
      bin.querySelector(".bin-items").appendChild(item);
      chip.remove();
      state.sortSelected = null;
      state.sortDone += 1;
      sortProgress.textContent = `${state.sortDone} / 6`;
      aiNovaStage?.classList.add("is-correct");
      aiNovaEngine?.happy();

      if (state.sortDone === 6) {
        sortFeedback.textContent = "¡Listo! La IA que te hace pensar te forma. La que piensa por ti te deja en el mismo lugar.";
        sortNext.disabled = false;
        aiNovaStage?.classList.add("is-complete");
        aiNovaEngine?.celebrate();
      } else {
        sortFeedback.textContent = "Bien visto. Elige la siguiente situación.";
      }
    });
  });

  // Pantalla 8
  function renderFinalScore() {
    const score = Math.min(100, Math.round(state.score));
    document.getElementById("final-score").textContent = `${score}/100`;
    requestAnimationFrame(() => document.getElementById("score-meter-fill").style.width = `${score}%`);
    const message = document.getElementById("score-message");
    const badge = document.getElementById("score-badge");
    const speech = document.getElementById("final-nova-speech");

    if (score >= 80) {
      message.textContent = "Entiendes que aprender vale más que solo entregar. El reto ahora es sostener ese criterio cuando la decisión sea más difícil.";
      badge.textContent = "BRÚJULA ÍNTEGRA";
      speech.textContent = "Ya piensas como el profesional que quieres construir. Llévate esa brújula contigo.";
    } else if (score >= 50) {
      message.textContent = "Vas construyendo el camino. Cada decisión suma, incluso las pequeñas.";
      badge.textContent = "RUMBO CONSCIENTE";
      speech.textContent = "Ya empezaste a mirar estas decisiones de otra manera. Ese cambio también cuenta.";
    } else {
      message.textContent = "Este resultado no te define. Lo valioso es que ahora tienes otra forma de mirar estas situaciones.";
      badge.textContent = "PRIMER PASO";
      speech.textContent = "Sin dramas. Verlo ya es el comienzo, y la siguiente decisión todavía está en tus manos.";
    }
  }

  const pledgeCheck = document.getElementById("pledge-check");
  const pledgeButton = document.getElementById("pledge-button");
  pledgeCheck?.addEventListener("change", () => pledgeButton.disabled = !pledgeCheck.checked);
  pledgeButton?.addEventListener("click", () => {
    const formSection = document.getElementById("form-section");
    document.body.classList.add("allow-page-scroll");
    formSection.hidden = false;
    pledgeButton.textContent = "RETO ACEPTADO ✓";
    pledgeButton.disabled = true;
    finalNovaEngine?.celebrate();
    document.getElementById("final-nova-speech").textContent = "La próxima decisión ya no estará en esta pantalla. Estará en tu día a día.";

    const formFrame = document.querySelector("#form-container iframe");
    if (formFrame && formFrame.src !== FORM_EMBED_URL) formFrame.src = FORM_EMBED_URL;
    setTimeout(() => formSection.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  });

  window.addEventListener("load", playHeroIntro);
})();
