/* Módulo de Dirección: filtros, menú, perfil, tema y UX.
   Se carga después de admin.js porque utiliza su contexto compartido. */

/* ============================================================
   V7.5 FUNCIONES DIRECTOR BY ELY GABRIEL
   ============================================================ */
async function cargarFiltroCursosEstudiantesV75(){
  const sel=$('filtroCursoEstudiantes');
  if(!sel)return;
  sel.innerHTML='<option value="">Cargando cursos...</option>';
  sel.disabled=true;
  try{
    await cargarCatalogosDirector(false);
    sel.innerHTML='<option value="">Todos los cursos</option>';
    (catalogoDirector.cursos||[]).forEach(c=>{
      const o=document.createElement('option');
      o.value=c.id;
      o.textContent=`${c.nombre} ${c.paralelo}`;
      o.dataset.nombre=String(c.nombre||'').toLowerCase();
      o.dataset.paralelo=String(c.paralelo||'').toLowerCase();
      sel.appendChild(o);
    });
    sel.disabled=false;
  }catch(e){
    console.error(e);
    sel.innerHTML='<option value="">Error al cargar cursos</option>';
  }
}

function aplicarFiltrosEstudiantesV75(){
  const sel=$('filtroCursoEstudiantes');
  const search=$('buscarEstudiantesDirector');
  const tbody=$('tablaEstudiantes');
  if(!tbody)return;
  const q=String(search?.value||'').toLowerCase().trim();
  const opt=sel?.selectedOptions?.[0];
  const curso=String(opt?.dataset.nombre||'').toLowerCase();
  const paralelo=String(opt?.dataset.paralelo||'').toLowerCase();
  [...tbody.querySelectorAll('tr')].forEach(row=>{
    const rc=String(row.dataset.curso||'').toLowerCase();
    const rp=String(row.dataset.paralelo||'').toLowerCase();
    const txt=String(row.textContent||'').toLowerCase();
    const cursoOk=!curso || (rc===curso && rp===paralelo);
    const textoOk=!q || txt.includes(q);
    row.hidden=!(cursoOk && textoOk);
  });
}

function activarFiltrosEstudiantesV75(){
  const sel=$('filtroCursoEstudiantes');
  const search=$('buscarEstudiantesDirector');
  if(!sel||!search||sel.dataset.v75==='1')return;
  sel.dataset.v75='1';
  cargarFiltroCursosEstudiantesV75();
  sel.addEventListener('change',aplicarFiltrosEstudiantesV75);
  search.addEventListener('input',aplicarFiltrosEstudiantesV75);
}

document.addEventListener('DOMContentLoaded',activarFiltrosEstudiantesV75);

function abrirMenuDirectorV75(){
  if(perfilActual?.rol!=='director')return;
  const menu=$('menuDirectorV75');
  if(!menu)return;
  menu.hidden=false;
  $('btnMenuDirectorV75')?.setAttribute('aria-expanded','true');
  document.body.classList.add('v75-menu-open');
}
function cerrarMenuDirectorV75(){
  const menu=$('menuDirectorV75');
  if(!menu)return;
  menu.hidden=true;
  $('btnMenuDirectorV75')?.setAttribute('aria-expanded','false');
  document.body.classList.remove('v75-menu-open');
}
function abrirDialogDirectorV75(id){
  if(perfilActual?.rol!=='director')return;
  const dialog=$(id);
  if(!dialog)return;
  cerrarMenuDirectorV75();
  dialog.hidden=false;
}
function cerrarDialogDirectorV75(id){
  const dialog=$(id); if(dialog)dialog.hidden=true;
}

async function abrirPerfilDirectorV75(){
  const {data:{user}}=await _supabase.auth.getUser();
  if(!user)return mostrarToast('Sesión no disponible.','error');
  const {data:p,error}=await _supabase.from('perfiles').select('nombre,rol').eq('id',user.id).maybeSingle();
  if(error)return mostrarToast(error.message,'error');
  $('perfilNombreV75').value=p?.nombre||user.user_metadata?.nombre||'';
  abrirDialogDirectorV75('perfilDirectorV75');
}
async function guardarPerfilDirectorV75(e){
  e.preventDefault();
  const {data:{user}}=await _supabase.auth.getUser();
  if(!user)return;
  const nombre=$('perfilNombreV75').value.trim();
  if(!nombre)return mostrarToast('Escribe tu nombre.','error');
  try{
    await invocarGestionarProfesor({action:'update_own_profile',nombre});
  }catch(error){
    return mostrarToast(error?.message||'No se pudo actualizar el perfil.','error');
  }
  const {error:metadataError}=await _supabase.auth.updateUser({data:{nombre}});
  if(metadataError)console.warn('El nombre se guardó en el perfil, pero no en los metadatos de Auth:',metadataError);
  perfilActual.nombre=nombre;
  $('nombreUsuario').textContent=nombre;
  $('saludoUsuario').textContent=`Bienvenido, ${nombre}`;
  cerrarDialogDirectorV75('perfilDirectorV75');
  mostrarToast('Perfil actualizado correctamente.','success');
}
async function cambiarPasswordDirectorV75(e){
  e.preventDefault();
  const a=$('perfilPassV75').value;
  const b=$('perfilPass2V75').value;
  if(a.length<8)return mostrarToast('La contraseña debe tener al menos 8 caracteres.','error');
  if(a!==b)return mostrarToast('Las contraseñas no coinciden.','error');
  const {error}=await _supabase.auth.updateUser({password:a});
  if(error)return mostrarToast(error.message,'error');
  e.target.reset();
  cerrarDialogDirectorV75('passwordDirectorV75');
  mostrarToast('Contraseña actualizada correctamente.','success');
}
async function cerrarSesionDirectorV75(){
  const {error}=await _supabase.auth.signOut();
  if(error)return mostrarToast(error.message,'error');
  location.reload();
}

function configurarTemaDirector(){
  const btn=$('btnTema');
  if(!btn || btn.dataset.configurado==='1')return;
  btn.dataset.configurado='1';
  const guardado=localStorage.getItem('gb-tema-admin');
  aplicarTemaDirector(guardado==='oscuro');
  btn.addEventListener('click',()=>aplicarTemaDirector(!document.body.classList.contains('gb-tema-oscuro')));
}
function aplicarTemaDirector(oscuro){
  document.body.classList.toggle('gb-tema-oscuro',oscuro);
  localStorage.setItem('gb-tema-admin',oscuro?'oscuro':'claro');
  const btn=$('btnTema');
  if(btn){const icono=oscuro?'<svg class="tema-icono" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>':'<svg class="tema-icono" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.2A8.5 8.5 0 0 1 8.8 3.8 8.6 8.6 0 1 0 20.2 15.2Z"/></svg>';btn.innerHTML=icono+`<span>${oscuro?'Claro':'Oscuro'}</span>`;btn.setAttribute('aria-label',oscuro?'Activar modo claro':'Activar modo oscuro');btn.title=oscuro?'Cambiar a modo claro':'Cambiar a modo oscuro';}
}

function configurarMenuDirectorV75(){
  $('btnMenuDirectorV75')?.addEventListener('click',abrirMenuDirectorV75);
  document.querySelectorAll('[data-director-tab]').forEach(btn=>btn.addEventListener('click',()=>{cambiarPestaña(btn.dataset.directorTab);cerrarMenuDirectorV75();}));
  configurarTemaDirector();
  $('cerrarMenuDirectorV75')?.addEventListener('click',cerrarMenuDirectorV75);
  $('abrirPerfilDirectorV75')?.addEventListener('click',abrirPerfilDirectorV75);
  $('abrirPasswordDirectorV75')?.addEventListener('click',()=>abrirDialogDirectorV75('passwordDirectorV75'));
  $('cerrarSesionDirectorV75')?.addEventListener('click',cerrarSesionDirectorV75);
  $('menuDirectorV75')?.addEventListener('click',e=>{if(e.target.id==='menuDirectorV75')cerrarMenuDirectorV75();});
  document.querySelectorAll('[data-close-dialog]').forEach(btn=>btn.addEventListener('click',()=>cerrarDialogDirectorV75(btn.dataset.closeDialog)));
  $('formPerfilDirectorV75')?.addEventListener('submit',guardarPerfilDirectorV75);
  $('formPasswordDirectorV75')?.addEventListener('submit',cambiarPasswordDirectorV75);
}

document.addEventListener('DOMContentLoaded',configurarMenuDirectorV75);

function actualizarInterfazDirectorV75(esDirector){
  const dash=$('vistaDashboard');
  const menuBtn=$('btnMenuDirectorV75');
  const logout=$('btnCerrarSesion');
  if(esDirector){
    dash?.classList.add('director-activo');
    if(menuBtn)menuBtn.hidden=false;
    const tema=$('btnTema'); if(tema)tema.hidden=false;
    if(logout)logout.hidden=true;
  }else{
    dash?.classList.remove('director-activo');
    if(menuBtn)menuBtn.hidden=true;
    const tema=$('btnTema'); if(tema)tema.hidden=true;
    if(logout)logout.hidden=false;
    cerrarMenuDirectorV75();
  }
}


/* ============================================================
   V7.6 — UX/Performance layer
   ============================================================ */
function configurarUXDirectorV76(){
  // Evita doble envío en cualquier formulario administrativo dinámico.
  document.addEventListener('submit',e=>{
    const form=e.target;
    if(!form.matches('.formulario-inline-contenido'))return;
    const btn=e.submitter;
    if(!btn)return;
    if(btn.dataset.v76Submitting==='1'){
      e.preventDefault();
      return;
    }
    btn.dataset.v76Submitting='1';
    setTimeout(()=>{ if(btn.isConnected) btn.dataset.v76Submitting='0'; },10000);
  },true);
}

document.addEventListener('DOMContentLoaded',configurarUXDirectorV76);

// La conexión y el estado de sesión se actualizan en cargarPerfil() de admin.js.
