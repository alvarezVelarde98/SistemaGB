/* Mejoras pequeñas de interfaz compartidas. */

// Ruta A, etapa 1: accesibilidad del nuevo formulario de acceso.
document.addEventListener('DOMContentLoaded',()=>{
  const toggle=document.getElementById('togglePassword');
  const input=document.getElementById('loginPassword');
  if(toggle&&input) toggle.addEventListener('click',()=>{
    const show=input.type==='password'; input.type=show?'text':'password';
    toggle.setAttribute('aria-label',show?'Ocultar contraseña':'Mostrar contraseña');
  });
});
