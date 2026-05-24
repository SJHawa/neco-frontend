import path from "node:path";

function shouldTryTypeScriptExtension(specifier) {
  return (
    (specifier.startsWith("./") ||
      specifier.startsWith("../") ||
      specifier.startsWith("/")) &&
    path.extname(specifier) === ""
  );
}

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (
      error?.code === "ERR_MODULE_NOT_FOUND" &&
      shouldTryTypeScriptExtension(specifier)
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }

    throw error;
  }
}
