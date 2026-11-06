import { createRouter, createWebHistory } from "vue-router";
import DashboardView from "./views/DashboardView.vue";
import DonorsView from "./views/DonorsView.vue";
import DocumentsView from "./views/DocumentsView.vue";
import OcrView from "./views/OcrView.vue";
import CatalogView from "./views/CatalogView.vue";
import DocumentInstancesView from "./views/DocumentInstancesView.vue";
import DocumentFormView from "./views/DocumentFormView.vue";
import NewDocumentInstanceView from "./views/NewDocumentInstanceView.vue";
import ReviewCenterView from "./views/ReviewCenterView.vue";
import LegalizationView from "./views/LegalizationView.vue";
import DocumentFinalizationView from "./views/DocumentFinalizationView.vue";
import AccessView from "./views/AccessView.vue";
import DonationProcessListView from "./views/DonationProcessListView.vue";
import DonationProcessDetailView from "./views/DonationProcessDetailView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/dashboard" },
    { path: "/acceso", component: AccessView, meta: { public: true } },
    { path: "/dashboard", component: DashboardView },
    { path: "/procesos", component: DonationProcessListView },
    { path: "/procesos/:processId", component: DonationProcessDetailView },
    { path: "/expedientes", component: DonorsView },
    { path: "/expedientes/:donorId/documentos", component: DocumentsView },
    { path: "/expedientes/:donorId/documentos/:documentId/ocr", component: OcrView },
    { path: "/catalogo-documental", component: CatalogView },
    { path: "/catalogo", component: CatalogView },
    { path: "/catalogo/:templateId", component: CatalogView },
    { path: "/expedientes/:donorId/instancias", component: DocumentInstancesView },
    { path: "/expedientes/:donorId/instancias/nueva/:templateVersionId", component: NewDocumentInstanceView },
    { path: "/expedientes/:donorId/instancias/:instanceId/revision", component: ReviewCenterView },
    { path: "/expedientes/:donorId/instancias/:instanceId/finalizacion", component: DocumentFinalizationView },
    { path: "/expedientes/:donorId/instancias/:instanceId", component: DocumentFormView },
    { path: "/expedientes/:donorId/legalizacion", component: LegalizationView },
    { path: "/:pathMatch(.*)*", redirect: "/dashboard" }
  ]
});

router.beforeEach((to) => {
  if (to.meta.public || localStorage.getItem("godt.jwtToken")) return true;
  return { path: "/acceso", query: { redirect: to.fullPath } };
});

export default router;
