(() => {
  if (window.__cvocpQuizSolverActive) {
    console.info("CVocp Quiz Solver already running.");
    return;
  }
  window.__cvocpQuizSolverActive = true;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

    const answers = {};
    const choiceIndex = {};
    quizItems.forEach((ques) => {
      const qid = ques.dataset.qstnNid;
      if (!qid) return;

      const choiceElems = Array.from(
        ques.querySelectorAll("div div div[data-part='choice-item']")
      );

      answers[qid] = [];
      choiceElems.forEach((_, idx) => {
        const input = document.getElementById(`choice-qstn-${qid}-${idx}`);
        if (input) {
          answers[qid].push(input.value);
        }
      });

      if (!answers[qid].length) {
        console.warn(`CVocp Quiz Solver: no choices detected for question ${qid}.`);
      }

      choiceIndex[qid] = 0;
    });

    const submitChoice = async (choiceMap) => {
      const payload = new URLSearchParams();
      payload.append("nid", quizNid);
      payload.append("sid", sessionId);

      Object.entries(choiceMap).forEach(([qid, choice]) => {
        const answerValue = answers[qid]?.[choice];
        if (typeof answerValue !== "undefined") {
          payload.append(`answer_${qid}`, answerValue);
        }
      });

      const response = await fetch("?q=cvocp/ajax/submitquizanswer", {
        method: "POST",
        body: payload
      });

      return response.json();
    };

    const isCorrectResult = (raw, qid) => {
      if (raw === "1" || raw === 1) return true;
      if (Array.isArray(raw)) return raw.some((value) => value === "1" || value === 1);
      if (typeof raw === "object" && raw !== null) {
        const value = raw[qid];
        if (value === "1" || value === 1) return true;
        return Object.values(raw).some((val) => val === "1" || val === 1);
      }
      return false;
    };
    for (const qid of Object.keys(answers)) {
      const numChoices = answers[qid].length;
      if (!numChoices) continue;

      console.group(`🧩 CVocp Quiz Solver · Question ${qid}`);
      let detected = false;

      for (let idx = 0; idx < numChoices; idx++) {
        const button = document.getElementById(`choice-qstn-${qid}-${idx}`);
        if (!button) {
          console.warn(`  ➜ Choice ${idx}: element not found.`);
          continue;
        }

        button.click();
        const result = await submitChoice({ [qid]: idx });
        const rawResult =
          typeof result.result === "object" ? result.result : result.result ?? null;

        console.log(
          `  ➜ Choice ${idx}: value=%o | raw=%o | score %s/%s`,
          answers[qid][idx],
          rawResult,
          result.score,
          result.scoretotal
        );
        if (isCorrectResult(rawResult, qid)) {
          console.log(`  ✅ Question ${qid} correct on choice ${idx}`);
          choiceIndex[qid] = idx;
          button.parentElement?.style && (button.parentElement.style.background = "#d1f7c4");
          detected = true;
          break;
        }

        await sleep(250);
      }

      if (!detected) {
        console.warn(`  ❌ Question ${qid}: no correct choice detected.`);
      }

      console.groupEnd();
    }

    const finalResult = await submitChoice(choiceIndex);
    console.log("CVocp Quiz Solver · Final submission", finalResult);
    if (Number(finalResult.score) === Number(finalResult.scoretotal)) {
      document
        .querySelectorAll('img[data-type="cross"]')
        .forEach((img) => (img.dataset.visible = "0"));
      document
        .querySelectorAll('img[data-type="check"]')
        .forEach((img) => (img.dataset.visible = "1"));
      alert("🎉 CVocp Quiz Solver: All answers correct.");
    } else {
      alert(
        `⚠️ CVocp Quiz Solver: Finished with score ${finalResult.score}/${finalResult.scoretotal}`
      );
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
