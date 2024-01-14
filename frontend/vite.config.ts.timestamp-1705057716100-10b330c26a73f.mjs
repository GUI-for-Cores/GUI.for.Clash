// vite.config.ts
import { defineConfig } from "file:///D:/MyProject/GoProject/GUI.for.Clash/frontend/node_modules/.pnpm/vite@5.0.11_@types+node@20.10.7_less@4.2.0/node_modules/vite/dist/node/index.js";
import vue from "file:///D:/MyProject/GoProject/GUI.for.Clash/frontend/node_modules/.pnpm/@vitejs+plugin-vue@5.0.2_vite@5.0.11_vue@3.4.7/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import { fileURLToPath, URL } from "node:url";
import Components from "file:///D:/MyProject/GoProject/GUI.for.Clash/frontend/node_modules/.pnpm/unplugin-vue-components@0.26.0_vue@3.4.7/node_modules/unplugin-vue-components/dist/vite.js";
var __vite_injected_original_import_meta_url = "file:///D:/MyProject/GoProject/GUI.for.Clash/frontend/vite.config.ts";
var vite_config_default = defineConfig({
  plugins: [
    vue(),
    Components({
      types: [],
      dts: "src/components/components.d.ts",
      globs: ["src/components/*/index.vue"]
    })
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url)),
      "@wails": fileURLToPath(new URL("./wailsjs", __vite_injected_original_import_meta_url))
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxNeVByb2plY3RcXFxcR29Qcm9qZWN0XFxcXEdVSS5mb3IuQ2xhc2hcXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXE15UHJvamVjdFxcXFxHb1Byb2plY3RcXFxcR1VJLmZvci5DbGFzaFxcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovTXlQcm9qZWN0L0dvUHJvamVjdC9HVUkuZm9yLkNsYXNoL2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHZ1ZSBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUnXHJcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGgsIFVSTCB9IGZyb20gJ25vZGU6dXJsJ1xyXG5pbXBvcnQgQ29tcG9uZW50cyBmcm9tICd1bnBsdWdpbi12dWUtY29tcG9uZW50cy92aXRlJ1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbXHJcbiAgICB2dWUoKSxcclxuICAgIENvbXBvbmVudHMoe1xyXG4gICAgICB0eXBlczogW10sXHJcbiAgICAgIGR0czogJ3NyYy9jb21wb25lbnRzL2NvbXBvbmVudHMuZC50cycsXHJcbiAgICAgIGdsb2JzOiBbJ3NyYy9jb21wb25lbnRzLyovaW5kZXgudnVlJ11cclxuICAgIH0pXHJcbiAgXSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICAnQCc6IGZpbGVVUkxUb1BhdGgobmV3IFVSTCgnLi9zcmMnLCBpbXBvcnQubWV0YS51cmwpKSxcclxuICAgICAgJ0B3YWlscyc6IGZpbGVVUkxUb1BhdGgobmV3IFVSTCgnLi93YWlsc2pzJywgaW1wb3J0Lm1ldGEudXJsKSlcclxuICAgIH1cclxuICB9XHJcbn0pXHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBbVUsU0FBUyxvQkFBb0I7QUFDaFcsT0FBTyxTQUFTO0FBQ2hCLFNBQVMsZUFBZSxXQUFXO0FBQ25DLE9BQU8sZ0JBQWdCO0FBSG9MLElBQU0sMkNBQTJDO0FBTTVQLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLElBQUk7QUFBQSxJQUNKLFdBQVc7QUFBQSxNQUNULE9BQU8sQ0FBQztBQUFBLE1BQ1IsS0FBSztBQUFBLE1BQ0wsT0FBTyxDQUFDLDRCQUE0QjtBQUFBLElBQ3RDLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLGNBQWMsSUFBSSxJQUFJLFNBQVMsd0NBQWUsQ0FBQztBQUFBLE1BQ3BELFVBQVUsY0FBYyxJQUFJLElBQUksYUFBYSx3Q0FBZSxDQUFDO0FBQUEsSUFDL0Q7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
