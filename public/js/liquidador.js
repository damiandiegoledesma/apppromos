const fab = document.getElementById("fab-liquidador");
const modal = document.getElementById("modal-liquidador");

fab.onclick = () => {
  modal.classList.add("active");
};

modal.onclick = (e) => {
  if (e.target === modal) {
    modal.classList.remove("active");
  }
};
