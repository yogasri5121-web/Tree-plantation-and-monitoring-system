const STORAGE_KEY = "greentrack_session_trees";

// sessionStorage keeps data after refresh,
// but clears it when the website tab is closed.
let trees = readTrees();

const treeDialog = document.getElementById("tree-dialog");
const monitorDialog = document.getElementById("monitor-dialog");

const treeForm = document.getElementById("tree-form");
const monitorForm = document.getElementById("monitor-form");

const tableBody = document.getElementById("tree-table-body");
const emptyState = document.getElementById("empty-state");
const emptyTitle = document.getElementById("empty-title");
const emptyMessage = document.getElementById("empty-message");
const emptyAddButton = document.getElementById("empty-add-button");

const searchInput = document.getElementById("search-input");
const toast = document.getElementById("toast");

function readTrees() {
  try {
    const savedTrees = sessionStorage.getItem(STORAGE_KEY);
    return savedTrees ? JSON.parse(savedTrees) : [];
  } catch (error) {
    console.error("Unable to read saved trees:", error);
    return [];
  }
}

function saveTrees() {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trees));
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "—";
  }

  const date = new Date(`${dateValue}T00:00:00`);

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function cleanText(value) {
  return String(value || "").trim();
}

function createUniqueId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function getStatusClass(status) {
  const statusClasses = {
    Healthy: "status-healthy",
    "Needs Water": "status-water",
    "Needs Maintenance": "status-maintenance",
    Dead: "status-dead"
  };

  return statusClasses[status] || "status-maintenance";
}

function updateDashboard() {
  const total = trees.length;

  const healthy = trees.filter(
    tree => tree.health === "Healthy"
  ).length;

  const needsCare = trees.filter(
    tree =>
      tree.health === "Needs Water" ||
      tree.health === "Needs Maintenance"
  ).length;

  const dead = trees.filter(
    tree => tree.health === "Dead"
  ).length;

  document.getElementById("total-count").textContent = total;
  document.getElementById("healthy-count").textContent = healthy;
  document.getElementById("care-count").textContent = needsCare;
  document.getElementById("dead-count").textContent = dead;
}

function createTableCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function renderTrees() {
  const searchText = searchInput.value.trim().toLowerCase();

  const filteredTrees = trees.filter(tree => {
    return (
      tree.treeId.toLowerCase().includes(searchText) ||
      tree.species.toLowerCase().includes(searchText) ||
      tree.location.toLowerCase().includes(searchText)
    );
  });

  tableBody.innerHTML = "";

  filteredTrees.forEach(tree => {
    const row = document.createElement("tr");

    // Tree and species cell
    const treeCell = document.createElement("td");
    const treeName = document.createElement("div");

    treeName.className = "tree-name";

    const species = document.createElement("strong");
    species.textContent = tree.species;

    const treeId = document.createElement("small");
    treeId.textContent = tree.treeId;

    treeName.appendChild(species);
    treeName.appendChild(treeId);
    treeCell.appendChild(treeName);

    row.appendChild(treeCell);

    // Location
    row.appendChild(createTableCell(tree.location));

    // Plantation date
    row.appendChild(
      createTableCell(formatDate(tree.plantationDate))
    );

    // Height
    row.appendChild(
      createTableCell(`${tree.height} cm`)
    );

    // Health
    const healthCell = document.createElement("td");
    const status = document.createElement("span");

    status.className =
      `status-pill ${getStatusClass(tree.health)}`;

    status.textContent = tree.health;

    healthCell.appendChild(status);
    row.appendChild(healthCell);

    // Action buttons
    const actionCell = document.createElement("td");
    const actionContainer = document.createElement("div");

    actionContainer.className = "action-buttons";

    const updateButton = document.createElement("button");
    updateButton.type = "button";
    updateButton.className = "table-button";
    updateButton.textContent = "Update";

    updateButton.addEventListener("click", () => {
      openMonitorDialog(tree.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "table-button delete";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", () => {
      deleteTree(tree.id);
    });

    actionContainer.appendChild(updateButton);
    actionContainer.appendChild(deleteButton);
    actionCell.appendChild(actionContainer);
    row.appendChild(actionCell);

    tableBody.appendChild(row);
  });

  updateEmptyState(filteredTrees.length, searchText);
  updateDashboard();
}

function updateEmptyState(numberOfResults, searchText) {
  if (numberOfResults > 0) {
    emptyState.classList.add("hidden");
    return;
  }

  emptyState.classList.remove("hidden");

  if (trees.length > 0 && searchText) {
    emptyTitle.textContent = "No matching trees";

    emptyMessage.textContent =
      "Try searching with another tree ID, species or location.";

    emptyAddButton.style.display = "none";
  } else {
    emptyTitle.textContent = "No trees recorded yet";

    emptyMessage.textContent =
      "Add your first tree to start monitoring the plantation.";

    emptyAddButton.style.display = "inline-block";
  }
}

function openAddTreeDialog() {
  treeForm.reset();

  treeForm.elements.plantationDate.value = getToday();

  document.getElementById("tree-form-error").textContent = "";

  treeDialog.showModal();

  treeForm.elements.treeId.focus();
}

function closeAddTreeDialog() {
  treeDialog.close();
}

function addTree(formValues) {
  const treeId = cleanText(formValues.treeId).toUpperCase();
  const species = cleanText(formValues.species);
  const location = cleanText(formValues.location);

  const duplicateExists = trees.some(tree => {
    return tree.treeId.toLowerCase() === treeId.toLowerCase();
  });

  if (duplicateExists) {
    throw new Error("This Tree ID already exists.");
  }

  const newTree = {
    id: createUniqueId(),
    treeId: treeId,
    species: species,
    location: location,
    plantationDate: formValues.plantationDate,
    height: Number(formValues.height),
    health: formValues.health,
    notes: "",
    lastInspection: formValues.plantationDate
  };

  trees.unshift(newTree);

  saveTrees();
  renderTrees();
}

function openMonitorDialog(treeRecordId) {
  const tree = trees.find(item => item.id === treeRecordId);

  if (!tree) {
    return;
  }

  monitorForm.reset();

  monitorForm.elements.recordId.value = tree.id;
  monitorForm.elements.height.value = tree.height;
  monitorForm.elements.health.value = tree.health;
  monitorForm.elements.notes.value = tree.notes || "";
  monitorForm.elements.lastInspection.value = getToday();

  document.getElementById(
    "selected-tree-summary"
  ).textContent =
    `${tree.treeId} · ${tree.species} · ${tree.location}`;

  monitorDialog.showModal();
}

function closeMonitorDialog() {
  monitorDialog.close();
}

function updateTree(formValues) {
  const tree = trees.find(
    item => item.id === formValues.recordId
  );

  if (!tree) {
    throw new Error("Tree record was not found.");
  }

  tree.height = Number(formValues.height);
  tree.health = formValues.health;
  tree.notes = cleanText(formValues.notes);
  tree.lastInspection = formValues.lastInspection;

  saveTrees();
  renderTrees();
}

function deleteTree(treeRecordId) {
  const tree = trees.find(item => item.id === treeRecordId);

  if (!tree) {
    return;
  }

  const shouldDelete = confirm(
    `Delete ${tree.treeId} (${tree.species})?`
  );

  if (!shouldDelete) {
    return;
  }

  trees = trees.filter(item => item.id !== treeRecordId);

  saveTrees();
  renderTrees();
  showToast("Tree record deleted");
}

let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

// Add-tree form submission
treeForm.addEventListener("submit", event => {
  event.preventDefault();

  const formValues = Object.fromEntries(
    new FormData(treeForm)
  );

  try {
    addTree(formValues);
    closeAddTreeDialog();
    showToast("Tree added successfully");
  } catch (error) {
    document.getElementById(
      "tree-form-error"
    ).textContent = error.message;
  }
});

// Monitoring form submission
monitorForm.addEventListener("submit", event => {
  event.preventDefault();

  const formValues = Object.fromEntries(
    new FormData(monitorForm)
  );

  try {
    updateTree(formValues);
    closeMonitorDialog();
    showToast("Monitoring update saved");
  } catch (error) {
    showToast(error.message);
  }
});

// Open and close buttons
document
  .getElementById("open-add-form")
  .addEventListener("click", openAddTreeDialog);

emptyAddButton.addEventListener(
  "click",
  openAddTreeDialog
);

document
  .getElementById("close-tree-dialog")
  .addEventListener("click", closeAddTreeDialog);

document
  .getElementById("cancel-tree-form")
  .addEventListener("click", closeAddTreeDialog);

document
  .getElementById("close-monitor-dialog")
  .addEventListener("click", closeMonitorDialog);

document
  .getElementById("cancel-monitor-form")
  .addEventListener("click", closeMonitorDialog);

// Search records
searchInput.addEventListener("input", renderTrees);

// Close a dialog by clicking outside its form
treeDialog.addEventListener("click", event => {
  if (event.target === treeDialog) {
    closeAddTreeDialog();
  }
});

monitorDialog.addEventListener("click", event => {
  if (event.target === monitorDialog) {
    closeMonitorDialog();
  }
});

// Display saved session records when the page loads
renderTrees();