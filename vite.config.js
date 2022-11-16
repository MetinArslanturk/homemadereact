function jsx() {
    return {
      name: "jsx",
      config() {
        return {
          esbuild: {
            jsxFactory: "_jsx_createElement",
            jsxFragment: "Fragment",
          },
        };
      },
    };
  }
  
  export default {
    plugins: [jsx()],
  };