document.addEventListener("DOMContentLoaded", () => {

  // --- FIREBASE ---
  const firebaseConfig = {
    apiKey: "AIzaSyCdYxKBXwyHXhKOXx_gRfXUI27Ji-T6Xws",
    authDomain: "rael-8ff91.firebaseapp.com",
    projectId: "rael-8ff91",
    storageBucket: "rael-8ff91.firebasestorage.app"
  };

  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  // ELEMENTOS
  const btnShowRsvp = document.getElementById("btnShowRsvp");
  const modalOverlay = document.getElementById("rsvp-modal");
  const modalSteps = document.querySelectorAll(".modal-step");
  const modalCloseBtn = document.getElementById("modal-close-btn");
  const finalCloseBtn = document.getElementById("btn-final-close");
  const rsvpForm = document.getElementById("rsvp-form");
  const giftContainer = document.getElementById("gift-container");
  const mensagemFinal = document.getElementById("thank-you-message");

  const btnAddAcompanhante = document.getElementById("btnAddAcompanhante");
  const acompanhantesContainer = document.getElementById("acompanhantes-container");

  const btnMenosCriancas = document.getElementById("btn-diminuir-criancas");
  const btnMaisCriancas = document.getElementById("btn-aumentar-criancas");
  const qtdCriancasSpan = document.getElementById("qtd-criancas");

  let acompanhantes = [];
  let criancas = 0;
  let nomeConvidado = "";
  let presenteEscolhido = "";

  // TROCAR ETAPA
  function showModalStep(stepNumber) {
    modalSteps.forEach(step => step.classList.remove("active"));
    document.getElementById(`modal-step-${stepNumber}`).classList.add("active");
  }

  // ABRIR MODAL
  btnShowRsvp.addEventListener("click", () => {
    showModalStep(1);
    modalOverlay.classList.add("visible");
  });

  // FECHAR MODAL
  const closeModal = () => modalOverlay.classList.remove("visible");
  modalCloseBtn.addEventListener("click", closeModal);
  finalCloseBtn.addEventListener("click", closeModal);

  // ADICIONAR ACOMPANHANTE
  btnAddAcompanhante.addEventListener("click", () => {
    const div = document.createElement("div");
    div.classList.add("campo-form");

    const id = Math.random().toString(36).substring(2, 9);

    div.innerHTML = `
      <label>Nome do Acompanhante:</label>
      <input type="text" id="acomp-${id}" class="acomp-input">
    `;
    acompanhantesContainer.appendChild(div);
  });

  // CRIANÇAS
  btnMaisCriancas.addEventListener("click", () => {
    criancas++;
    qtdCriancasSpan.innerText = criancas;
  });

  btnMenosCriancas.addEventListener("click", () => {
    if (criancas > 0) criancas--;
    qtdCriancasSpan.innerText = criancas;
  });

  // EMBARALHAR
  const embaralhar = arr => arr.sort(() => Math.random() - 0.5);

  // SUBMIT DO FORM
  rsvpForm.addEventListener("submit", (e) => {
    e.preventDefault();

    nomeConvidado = document.getElementById("nome-convidado").value.trim();

    if (!nomeConvidado) return alert("Digite seu nome!");

    acompanhantes = [...document.querySelectorAll(".acomp-input")]
      .map(i => i.value.trim())
      .filter(v => v.length > 0);

    showModalStep(2);
    carregarPresentes();
  });

  // PRESENTES
  function carregarPresentes() {
    giftContainer.innerHTML = "<p>Carregando presentes...</p>";

    db.collection("presentes").get().then(snapshot => {
      let presentes = [];

      snapshot.forEach(doc => {
        const d = doc.data();
        if (d.quantidade > 0) {
          presentes.push({
            id: doc.id,
            nome: d.nome,
            quantidade: d.quantidade,
            imageUrl: d.imageUrl || ""
          });
        }
      });

      if (presentes.length === 0) {
        giftContainer.innerHTML = "<p>Nenhum presente disponível no momento.</p>";
        return;
      }

      presentes = embaralhar(presentes);
      giftContainer.innerHTML = "";

      presentes.forEach(p => {
        const item = document.createElement("div");
        item.classList.add("gift-item");

        item.innerHTML = `
          <div class="gift-card">
            <img src="${p.imageUrl}">
            <h3>${p.nome}</h3>
            <button class="btn-presentear" data-id="${p.id}" data-nome="${p.nome}">
              Presentear
            </button>
          </div>
        `;
        giftContainer.appendChild(item);
      });

      document
        .querySelectorAll(".btn-presentear")
        .forEach(btn =>
          btn.addEventListener("click", (e) => {
            confirmarPresente(
              e.target.dataset.id,
              e.target.dataset.nome
            );
          }));
    });
  }

  // CONFIRMAR PRESENTE
  function confirmarPresente(idPresente, nomePresente) {
    if (!confirm(`Confirmar o presente "${nomePresente}"?`)) return;

    const ref = db.collection("presentes").doc(idPresente);

    db.runTransaction(async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists) throw "Erro: Presente não encontrado.";

      const novaQtd = snap.data().quantidade - 1;
      if (novaQtd < 0) throw "Presente esgotado.";

      t.update(ref, { quantidade: novaQtd });

      t.set(db.collection("convidados").doc(), {
        nome: nomeConvidado,
        acompanhantes: acompanhantes,
        criancas: criancas,
        presente: nomePresente,
        data: firebase.firestore.FieldValue.serverTimestamp()
      });
    })
      .then(() => {
        mensagemFinal.innerHTML = `
          <p><strong>${nomeConvidado}</strong>, presença confirmada!</p>
          <p>Presente escolhido: <strong>${nomePresente}</strong></p>
          <p>Acompanhantes: <strong>${acompanhantes.join(", ") || "Nenhum"}</strong></p>
          <p>Crianças: <strong>${criancas}</strong></p>
        `;
        showModalStep(3);
      })
      .catch(() => alert("Erro ao confirmar seu presente."));
  }

});
