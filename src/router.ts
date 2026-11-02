import { createRouter, createWebHistory } from "vue-router";
import DashboardView from "./views/DashboardView.vue";
import DonorsView from "./views/DonorsView.vue";

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/dashboard" },
    { path: "/dashboard", component: DashboardView },
    { path: "/expedientes", component: DonorsView },
    { path: "/:pathMatch(.*)*", redirect: "/dashboard" }
  ]
});
