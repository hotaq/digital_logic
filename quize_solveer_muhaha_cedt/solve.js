(async function () {
  const quizItems = document.querySelectorAll(".cvocp-quiz-item.cvocp-quiz-course-theme");
  const answers = {};
  const choiceIndex = {};

  // Collect all choices
  for (const ques of quizItems) {
    const qid = ques.dataset.qstnNid;
    const choiceElems = ques.querySelectorAll("div div div[data-part='choice-item']");
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

  // Try each question one by one
  for (const qid in answers) {
    const numChoices = answers[qid].length;
    console.log(`🧩 Trying question ${qid} with ${numChoices} choices...`);
    for (let i = 0; i < numChoices; i++) {
      const btn = document.getElementById(`choice-qstn-${qid}-${i}`);
      if (!btn) continue;
      btn.click();

      const res = await submitChoice({ [qid]: i });
      console.log(`  ➜ Choice ${i}: result=`, res.result?.[qid], "score:", res.score);

      // ✅ Stop when this question is correct
      if (res.result?.[qid] === "1") {
        console.log(`✅ Question ${qid} correct on choice ${i}`);
        break;
      }
    }
  }

  // Final check if all correct
  const finalRes = await submitChoice(choiceIndex);
  if (finalRes.score === finalRes.scoretotal) {
    document.querySelectorAll('img[data-type="cross"]').forEach(n => (n.dataset.visible = "0"));
    document.querySelectorAll('img[data-type="check"]').forEach(n => (n.dataset.visible = "1"));
    alert("🎉 Done! All answers correct.");
  } else {
    alert(`⚠️ Finished but score ${finalRes.score}/${finalRes.scoretotal}`);
  }
})();