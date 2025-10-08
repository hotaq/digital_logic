(() => {
  if (window.__cvocpQuizSolverActive) {
    console.info("CVocp Quiz Solver already running.");
    return;
  }
  window.__cvocpQuizSolverActive = true;

  const run = async () => {
    const quizItems = Array.from(document.querySelectorAll(".cvocp-quiz-item"));
    if (!quizItems.length) {
      console.warn("CVocp Quiz Solver: no quiz items found on the page.");
      return;
    }

    const header = document.querySelector("#cvocp-quiz-header");
    const quizNid = header?.dataset?.nid ?? null;
    const sessionInput = document.querySelector("#cvocp-quiz-session");
    const sessionId = sessionInput?.value ?? sessionInput?.dataset?.value ?? null;

    if (!quizNid || !sessionId) {
      console.warn("CVocp Quiz Solver: missing quiz metadata (nid or sid).");
      return;
    }

    const questionState = Object.create(null);
    let totalChoiceCount = 0;

    quizItems.forEach((question) => {
      const qid = question.dataset.qstnNid;
      if (!qid) return;

      const choiceNodes = Array.from(
        question.querySelectorAll("div div div[data-part='choice-item']")
      );

      const selections = [];
      choiceNodes.forEach((node, idx) => {
        const input = document.getElementById(`choice-qstn-${qid}-${idx}`);
        if (!input) return;
        selections.push({
          input,
          wrapper: node,
          value: input.value,
          label: node.innerText?.trim() ?? `Choice ${idx + 1}`
        });
      });

      if (!selections.length) {
        console.warn(`CVocp Quiz Solver: no selectable choices for question ${qid}.`);
        return;
      }

      questionState[qid] = {
        selections,
        index: 0,
        solved: false
      };

      totalChoiceCount += selections.length;
    });

    const qids = Object.keys(questionState);
    if (!qids.length) {
      console.warn("CVocp Quiz Solver: no valid questions detected.");
      return;
    }

    const parseQuestionResult = (resultPayload, qid) => {
      if (resultPayload == null) return null;

      if (typeof resultPayload === "object" && !Array.isArray(resultPayload)) {
        if (Object.prototype.hasOwnProperty.call(resultPayload, qid)) {
          return resultPayload[qid];
        }
        const directMatch = Object.values(resultPayload).find(
          (value) => value === "1" || value === 1 || value === "0" || value === 0
        );
        return directMatch ?? null;
      }

      if (typeof resultPayload === "string" || typeof resultPayload === "number") {
        return resultPayload;
      }

      if (Array.isArray(resultPayload)) {
        const canonical = resultPayload.find(
          (value) => value === "1" || value === 1 || value === "0" || value === 0
        );
        return canonical ?? null;
      }

      return null;
    };

    const submitSelection = async (selectionMap) => {
      const payload = new URLSearchParams();
      payload.append("nid", quizNid);
      payload.append("sid", sessionId);

      Object.entries(selectionMap).forEach(([qid, choiceIndex]) => {
        const choice = questionState[qid]?.selections?.[choiceIndex];
        if (choice && typeof choice.value !== "undefined") {
          payload.append(`answer_${qid}`, choice.value);
        }
      });

      const response = await fetch("?q=cvocp/ajax/submitquizanswer", {
        method: "POST",
        body: payload
      });

      return response.json();
    };

    const pending = new Set(qids);
    const attemptLimit = totalChoiceCount + qids.length;
    let attempts = 0;
    let lastResponse = null;

    while (pending.size && attempts < attemptLimit) {
      attempts += 1;

      const submission = {};
      pending.forEach((qid) => {
        const state = questionState[qid];
        const selection = state.selections[state.index];
        if (!selection) return;

        selection.input.click();
        submission[qid] = state.index;
      });

      if (!Object.keys(submission).length) {
        console.warn("CVocp Quiz Solver: no further selectable choices; aborting.");
        break;
      }

      lastResponse = await submitSelection(submission);
      const resultPayload = lastResponse?.result ?? null;

      pending.forEach((qid) => {
        const state = questionState[qid];
        const selection = state.selections[state.index];
        if (!selection) {
          pending.delete(qid);
          return;
        }

        const rawResult = parseQuestionResult(resultPayload, qid);
        const isCorrect = rawResult === "1" || rawResult === 1;
        const isIncorrect = rawResult === "0" || rawResult === 0;

        if (isCorrect) {
          state.solved = true;
          selection.wrapper.style.background = "#d1f7c4";
          pending.delete(qid);
          return;
        }

        if (isIncorrect || rawResult == null) {
          state.index += 1;
          if (state.index >= state.selections.length) {
            console.warn(`CVocp Quiz Solver: exhausted choices for question ${qid}.`);
            pending.delete(qid);
          }
        }
      });

      const score = Number(lastResponse?.score ?? 0);
      const total = Number(lastResponse?.scoretotal ?? 0);
      if (total && score === total) break;
    }

    const finalSelection = {};
    Object.entries(questionState).forEach(([qid, state]) => {
      const safeIndex = Math.min(state.index, state.selections.length - 1);
      const selection = state.selections[safeIndex];
      if (!selection) return;
      finalSelection[qid] = safeIndex;
      if (!state.solved) {
        selection.wrapper.style.background = "#fce4e4";
      }
    });

    if (Object.keys(finalSelection).length) {
      lastResponse = await submitSelection(finalSelection);
    }

    console.log("CVocp Quiz Solver · Final submission", lastResponse);

    if (
      lastResponse &&
      Number(lastResponse.score ?? 0) === Number(lastResponse.scoretotal ?? NaN)
    ) {
      document
        .querySelectorAll('img[data-type="cross"]')
        .forEach((img) => (img.dataset.visible = "0"));
      document
        .querySelectorAll('img[data-type="check"]')
        .forEach((img) => (img.dataset.visible = "1"));
      alert("🎉 CVocp Quiz Solver: All answers correct.");
    } else {
      const score = lastResponse?.score ?? "?";
      const total = lastResponse?.scoretotal ?? "?";
      alert(`⚠️ CVocp Quiz Solver: Finished with score ${score}/${total}`);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
