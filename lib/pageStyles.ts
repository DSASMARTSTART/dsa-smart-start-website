let publicStyles: Promise<unknown> | undefined;
let workspaceStyles: Promise<unknown> | undefined;

export function loadPublicStyles() {
  // The complete workspace sheet already covers public pages. Reuse it instead
  // of downloading a subset later and changing the global utility cascade.
  return publicStyles ?? workspaceStyles ?? (publicStyles = import('../route.css'));
}

export function loadWorkspaceStyles() {
  // If public styles were requested first, their link precedes this full sheet.
  // Otherwise future public routes reuse this sheet, so order stays consistent.
  return workspaceStyles ??= import('../workspace.css');
}
