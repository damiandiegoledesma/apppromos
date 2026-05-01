// 🔧 PATCH V12.3.1

import { handlePublicAccess } from "./public-access.js";

// 🔴 REEMPLAZAR bloque de redirect por esto:

if (!user) {

  handlePublicAccess({
    showLogin: () => renderLogin(),       
    showRegister: () => renderRegister(), 
    startDemo: () => startDemoMode()      
  });

  return;
}
