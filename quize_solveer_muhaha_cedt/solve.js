(async function () {
  const quizItems = document.querySelectorAll(".cvocp-quiz-item");
  const answers = {};
  const choiceIndex = {};

  // Collect all choices
  for (const ques of quizItems) {
    const qid = ques.dataset.qstnNid;
    const choiceElems = ques.querySelectorAll("div[data-part='choice-item']");
    answers[qid] = [];
    for (let i = 0; i < choiceElems.length; i++) {
      const el = document.getElementById(`choice-qstn-${qid}-${i}`);
      if (el) answers[qid].push(el.value);
    }
    choiceIndex[qid] = 0;
  }

  async function submitChoice(choiceMap) {
    const data = {
      nid: $("#cvocp-quiz-header").attr("data-nid"),
      sid: $("#cvocp-quiz-session").val()
    };
    for (const qid in choiceMap) {
      data[`answer_${qid}`] = answers[qid][choiceMap[qid]];
    }

    const res = await fetch("?q=cvocp/ajax/submitquizanswer", {
      method: "POST",
      body: new URLSearchParams(data)
    });
    return await res.json();
  }

  // Detect correct choice for each question
  for (const qid in answers) {
    const numChoices = answers[qid].length;
    console.log(`🧩 Trying question ${qid} (${numChoices} choices)...`);

    let found = false;

    for (let i = 0; i < numChoices; i++) {
      const btn = document.getElementById(`choice-qstn-${qid}-${i}`);
      if (!btn) continue;
      btn.click();

      const res = await submitChoice({ [qid]: i });
      const resultRaw = res.result;
      const score = res.score ?? 0;

      // Check if correct (handle various formats)
      const isCorrect =
        resultRaw === "1" ||
        resultRaw === 1 ||
        resultRaw?.[qid] === "1" ||
        resultRaw?.[qid] === 1 ||
        (Array.isArray(resultRaw) && resultRaw.includes("1")) ||
        (typeof resultRaw === "object" && Object.values(resultRaw).includes("1"));

      console.log(`  ➜ Choice ${i}:`, answers[qid][i], "| result=", resultRaw, "| score:", score);

      if (isCorrect) {
        console.log(`✅ Question ${qid} correct on choice ${i}`);
        choiceIndex[qid] = i;
        found = true;
        // Mark visually
        btn.parentElement.style.background = "#d1f7c4";
        break;
      }

      await new Promise(r => setTimeout(r, 250));
    }

    if (!found) console.warn(`❌ Question ${qid} — no correct choice detected`);
  }

  // Final recheck submission
  const finalRes = await submitChoice(choiceIndex);
  console.log("Final submission:", finalRes);

  if (finalRes.score === finalRes.scoretotal) {
    alert("🎉 Done! All answers correct.");
  } else {
    alert(`⚠️ Finished but score ${finalRes.score}/${finalRes.scoretotal}`);
  }
})();