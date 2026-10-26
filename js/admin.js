/* V7.0 — SELECTOR REAL EN FORMULARIOS DE DIRECTOR */
/* V6.8 — SELECTORES REALES DE CURSOS */
/* V6.6 — Director: selector de cursos y diagnóstico de Edge Function */
let perfilActual = null;
let toastTimer = null;

const $ = (id) => document.getElementById(id);


/* V7.6 — caché temporal de catálogos del Director.
   Supabase sigue siendo la fuente de verdad; la caché solo evita consultas repetidas
   mientras la sesión del panel está abierta. */
const catalogoDirector = {
  cursos: null,
  materias: null,
  cargando: null,
  actualizadoEn: null
};

function catalogosListos(){
  return Array.isArray(catalogoDirector.cursos) && Array.isArray(catalogoDirector.materias);
}

function marcarEstadoConexion(texto='● Conectado', tipo='ok'){
  const el=$('estadoConexionDirector');
  if(!el)return;
  el.hidden=perfilActual?.rol!=='director';
  el.textContent=texto;
  el.className=`estado-conexion-director ${tipo==='error'?'estado-conexion-error':''}`;
}

async function cargarCatalogosDirector(force=false){
  if(perfilActual?.rol!=='director') return false;
  if(!force && catalogosListos()) return true;
  if(catalogoDirector.cargando) return catalogoDirector.cargando;

  const promise=(async()=>{
    marcarEstadoConexion('● Cargando...','info');
    const [rc,rm]=await Promise.all([
      _supabase.from('cursos').select('id,nombre,paralelo').order('nombre').order('paralelo'),
      _supabase.from('materias').select('id,nombre,campo').order('nombre')
    ]);
    if(rc.error || rm.error){
      catalogoDirector.cursos=null;
      catalogoDirector.materias=null;
      marcarEstadoConexion('● Error de conexión','error');
      throw (rc.error || rm.error);
    }
    catalogoDirector.cursos=rc.data||[];
    catalogoDirector.materias=rm.data||[];
    catalogoDirector.actualizadoEn=new Date();
    marcarEstadoConexion('● Conectado','ok');
    return true;
  })();
  catalogoDirector.cargando=promise;
  try{return await promise;}finally{catalogoDirector.cargando=null;}
}

function renderCursosDesdeCache(){
  const data=catalogoDirector.cursos||[];
  const tb=$('tablaCursos');
  if(!tb)return data.length;
  tb.innerHTML=data.map(c=>`<tr><td>${esc(normalizarTexto(c.nombre))}</td><td>${esc(normalizarTexto(c.paralelo))}</td><td class="acciones-tabla"><button type="button" class="boton-editar" data-editar-curso="${c.id}">Editar</button><button type="button" class="boton-eliminar" data-eliminar-curso="${c.id}">Eliminar</button></td></tr>`).join('') || '<tr><td colspan="3">No hay cursos.</td></tr>';
  tb.querySelectorAll('[data-editar-curso]').forEach(b=>b.addEventListener('click',()=>{const c=data.find(x=>String(x.id)===b.dataset.editarCurso);if(c)editarCurso(c);}));
  tb.querySelectorAll('[data-eliminar-curso]').forEach(b=>b.addEventListener('click',()=>eliminarCurso(Number(b.dataset.eliminarCurso))));
  return data.length;
}

function renderMateriasDesdeCache(){
  const data=catalogoDirector.materias||[];
  const tb=$('tablaMaterias');
  if(!tb)return data.length;
  tb.innerHTML=data.map(m=>`<tr><td>${esc(normalizarTexto(m.nombre))}</td><td>${esc(normalizarTexto(m.campo))}</td><td class="acciones-tabla"><button type="button" class="boton-editar" data-editar-materia="${m.id}">Editar</button><button type="button" class="boton-eliminar" data-eliminar-materia="${m.id}">Eliminar</button></td></tr>`).join('') || '<tr><td colspan="3">No hay materias.</td></tr>';
  tb.querySelectorAll('[data-editar-materia]').forEach(b=>b.addEventListener('click',()=>{const m=data.find(x=>String(x.id)===b.dataset.editarMateria);if(m)editarMateria(m);}));
  tb.querySelectorAll('[data-eliminar-materia]').forEach(b=>b.addEventListener('click',()=>eliminarMateria(Number(b.dataset.eliminarMateria))));
  return data.length;
}


function esc(value='') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function mostrarToast(texto, tipo='info') {
  const el=$('toast'); if(!el) return;
  el.textContent=texto; el.className=`toast toast-${tipo}`;
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>{el.className='toast';},3500);
}
function mostrarErrorLogin(texto, tipo='error') {
  const el=$('errorLogin');
  if(!el)return;
  el.textContent=texto;
  el.className=`form-message form-message-${tipo}`;
  el.hidden=false;
}
function limpiarErrorLogin(){
  const el=$('errorLogin');
  if(!el)return;
  el.hidden=true; el.textContent=''; el.className='form-message';
}
function mensajeErrorAutenticacion(error){
  const msg=String(error?.message||'').toLowerCase();
  if(msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) return 'El correo o la contraseña son incorrectos. Comprueba tus datos e inténtalo nuevamente.';
  if(msg.includes('email not confirmed')) return 'La cuenta todavía no ha sido confirmada. Contacta al administrador del sistema.';
  if(msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) return 'No pudimos comunicarnos con el servidor. Comprueba tu conexión a Internet e inténtalo nuevamente.';
  return 'No se pudo iniciar sesión. Comprueba tus datos e inténtalo nuevamente.';
}
function normalizarTexto(valor=''){
  return String(valor).normalize('NFC').replace(/\s+/g,' ').trim().toLocaleUpperCase('es');
}
function normalizarCorreo(valor=''){
  return String(valor).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
}
function nombreCorreoBase(nombre='', primerApellido=''){
  const primerNombre=normalizarCorreo(nombre).replace(/[^a-z0-9\s.-]/g,' ').split(/[\s]+/).filter(Boolean)[0]||'';
  const apellido=normalizarCorreo(primerApellido).replace(/[^a-z0-9.-]/g,'');
  const limpiar=parte=>parte.replace(/[^a-z0-9]/g,'');
  if(!primerNombre || !apellido)return '';
  return `${limpiar(primerNombre)}.${limpiar(apellido)}`.replace(/\.+/g,'.').replace(/^\.|\.$/g,'');
}
async function correoInstitucionalUnico(nombre, primerApellido=''){
  const base=nombreCorreoBase(nombre,primerApellido);
  if(!base || !base.includes('.')) throw new Error('Escribe el nombre y al menos un apellido del profesor.');
  const {data,error}=await _supabase.from('perfiles').select('email').not('email','is',null);
  if(error)throw new Error('No se pudo comprobar la disponibilidad del correo institucional.');
  const usados=new Set((data||[]).map(x=>normalizarCorreo(x.email)));
  let candidato=`${base}@gb.edu`, n=2;
  while(usados.has(candidato)) candidato=`${base}${n++}@gb.edu`;
  return candidato;
}
function configurarMayusculasYCorreo(form){
  if(!form || form.dataset.v32Configurado==='1')return;
  form.dataset.v32Configurado='1';
  form.querySelectorAll('[data-uppercase="true"]').forEach(input=>{
    input.addEventListener('input',()=>{
      const inicio=input.selectionStart, fin=input.selectionEnd;
      input.value=input.value.toLocaleUpperCase('es');
      try{input.setSelectionRange(inicio,fin)}catch(_){ }
    });
    input.addEventListener('blur',()=>input.value=normalizarTexto(input.value));
  });
  const nombre=form.querySelector('[name="nombre"]');
  const nombres=form.querySelector('[name="nombres"]');
  const apellido=form.querySelector('[name="primer_apellido"]');
  const email=form.querySelector('[name="email"]');
  if(email && email.dataset.autogenerado==='true'){
    let contador=0, temporizador=null;
    const actualizar=()=>{
      const version=++contador;
      clearTimeout(temporizador);
      const valorNombre=nombres?.value || nombre?.value || '';
      const valorApellido=apellido?.value || '';
      const base=nombreCorreoBase(valorNombre,valorApellido);
      if(!base){email.value='';return;}
      email.value=`${base}@gb.edu`;
      email.title='Correo institucional generado automáticamente';
      temporizador=setTimeout(async()=>{
        try{
          const unico=await correoInstitucionalUnico(valorNombre,valorApellido);
          if(version===contador)email.value=unico;
        }catch(e){console.warn(e);}
      },250);
    };
    [nombre,nombres,apellido].filter(Boolean).forEach(input=>{input.addEventListener('input',actualizar);input.addEventListener('blur',actualizar);});
    actualizar();
  }
}

async function iniciar() {
  const {data:{session}} = await _supabase.auth.getSession();
  if(session) await cargarPerfil(session.user.id);
}
document.addEventListener('DOMContentLoaded', iniciar);

async function iniciarSesion(event){
  event.preventDefault();
  const form=$('formLogin'), boton=form?.querySelector('[type="submit"]');
  if(boton?.dataset.cargando==='1')return;
  try{
    limpiarErrorLogin();
    const email=normalizarCorreo($('loginEmail').value), password=$('loginPassword').value;
    if(boton){boton.dataset.cargando='1';boton.disabled=true;boton.dataset.textoOriginal=boton.innerHTML;boton.innerHTML='<span class="login-spinner" aria-hidden="true"></span> Verificando credenciales…';}
    mostrarErrorLogin('Estamos verificando tus datos…','info');
    const {data,error}=await _supabase.auth.signInWithPassword({email,password});
    if(error) throw error;
    limpiarErrorLogin();
    const ok=await cargarPerfil(data.user.id);
    if(!ok) await _supabase.auth.signOut();
  }catch(e){
    mostrarErrorLogin(mensajeErrorAutenticacion(e));
    console.error('Error de inicio de sesión:',e);
  }finally{
    if(boton){boton.disabled=false;boton.dataset.cargando='0';if(boton.dataset.textoOriginal)boton.innerHTML=boton.dataset.textoOriginal;}
  }
}

async function cargarPerfil(userId) {
  const {data,error}=await _supabase.from('perfiles').select('id,nombre,email,rol,curso_asignado,paralelo_asignado').eq('id',userId).maybeSingle();
  if(error || !data) { mostrarErrorLogin('Tu cuenta no tiene un perfil académico configurado. Contacta al director del sistema.'); return false; }
  if(!['director','profesor'].includes(data.rol)) { mostrarErrorLogin('Tu cuenta no tiene permisos válidos para acceder al panel. Contacta al director.'); return false; }
  perfilActual=data;
  marcarEstadoConexion(data.rol==='director'?'● Conectado':'', 'ok');
  $('vistaLogin').hidden=true; $('vistaDashboard').hidden=false;
  actualizarInterfazDirectorV75(data.rol==='director');
  $('nombreUsuario').textContent=data.nombre;
  $('saludoUsuario').textContent=`Bienvenido, ${data.nombre}`;
  $('badgeRol').textContent=data.rol==='director'?'Director':'Profesor';
  if(data.rol==='director') {
    $('descripcionRol').textContent='Administración de profesores, estudiantes, materias y cursos.';
    $('navDirector').hidden=false;
    document.body.classList.remove('gb-profesor-mode');
    $('sidebarProfesorDashboard')?.setAttribute('hidden','');
    document.body.classList.add('gb-director-mode');
    $('sidebarDirectorDashboard').hidden=false;
    cambiarPestaña('inicio'); await cargarTodoDirector();
  } else {
    $('tituloPanel').textContent='Profesor / Tutor';
    $('subtituloPanel').textContent='Gestión de calificaciones';
    $('descripcionRol').textContent=`Curso asignado: ${data.curso_asignado || 'Sin asignar'} ${data.paralelo_asignado || ''}`;
    document.body.classList.remove('gb-director-mode');
    document.body.classList.add('gb-profesor-mode');
    if($('sidebarDirectorDashboard')) $('sidebarDirectorDashboard').hidden=true;
    sincronizarNavegacionProfesorV77();
    $('navDirector').hidden=true;
    $('seccionInicio').hidden=true;
    $('seccionProfesores').hidden=true;
    $('seccionEstudiantes').hidden=true;
    $('seccionMaterias').hidden=true;
    $('seccionCursos').hidden=true;
    $('dashboardProfesorV77').hidden=false;
    $('btnCerrarSesion').hidden=true;
    $('btnMenuProfesorV77').hidden=false;
    // El tema visual también está disponible para el panel docente.
    const temaProfesor=$('btnTema'); if(temaProfesor){ temaProfesor.hidden=false; temaProfesor.style.display='inline-flex'; temaProfesor.setAttribute('aria-label', document.body.classList.contains('gb-tema-oscuro')?'Activar modo claro':'Activar modo oscuro'); }
    $('menuProfesorNombreV77').textContent=data.nombre || 'Profesor / Tutor';
    $('profesorCursoV77').textContent=`${data.curso_asignado || 'Sin asignar'} ${data.paralelo_asignado || ''}`.trim();
    configurarMenuProfesorV77();
    await cargarDashboardProfesorV77();
  }
  return true;
}

async function cargarTodoDirector(){
  try{
    await cargarCatalogosDirector(false);
    await cargarFiltroCursosEstudiantesV75();
    const [prof,est]=await Promise.all([cargarProfesores(),cargarEstudiantes()]);
    const mat=renderMateriasDesdeCache();
    const cur=renderCursosDesdeCache();
    $('statProfesores').textContent=prof;
    $('statEstudiantes').textContent=est;
    $('statMaterias').textContent=mat;
    $('statCursos').textContent=cur;
    // El resumen de calificaciones se retiró del inicio; los datos administrativos se conservan.
  }catch(e){
    console.error('cargarTodoDirector:',e);
    mostrarToast('No se pudieron cargar todos los datos','error');
  }
}


async function cargarProfesores(){
  const {data,error}=await _supabase.from('perfiles').select('id,nombre,email,rol,curso_asignado,paralelo_asignado').eq('rol','profesor').order('nombre');
  const tb=$('tablaProfesores'); if(error){tb.innerHTML='<tr><td colspan="5">No se pudieron cargar los profesores.</td></tr>';return 0;}
  const profesores=data||[];
  tb.innerHTML=profesores.map(p=>`<tr><td>${esc(normalizarTexto(p.nombre))}</td><td>${esc(normalizarCorreo(p.email||'—'))}</td><td>${esc(normalizarTexto(p.curso_asignado||'—'))} ${esc(normalizarTexto(p.paralelo_asignado||''))}</td><td><span class="badge-rol">Profesor</span></td><td class="acciones-tabla"><button type="button" class="boton-editar" data-editar-profesor="${esc(p.id)}">Editar</button><button type="button" class="boton-eliminar" data-eliminar-profesor="${esc(p.id)}">Eliminar</button></td></tr>`).join('') || '<tr><td colspan="5">No hay profesores registrados.</td></tr>';
  tb.querySelectorAll('[data-editar-profesor]').forEach(b=>b.addEventListener('click',()=>{const p=profesores.find(x=>x.id===b.dataset.editarProfesor);if(p)editarProfesor(p);}));
  tb.querySelectorAll('[data-eliminar-profesor]').forEach(b=>b.addEventListener('click',()=>eliminarProfesor(b.dataset.eliminarProfesor)));
  return profesores.length;
}
async function cargarEstudiantes(){
  const {data,error}=await _supabase.from('estudiantes').select('id,ci,nombre,curso,paralelo').order('nombre');
  const tb=$('tablaEstudiantes'); if(error){tb.innerHTML='<tr><td colspan="5">No se pudieron cargar los estudiantes.</td></tr>';return 0;}
  const estudiantes=data||[];
  tb.innerHTML=estudiantes.map(e=>`<tr data-curso="${esc(e.curso)}" data-paralelo="${esc(e.paralelo)}"><td>${esc(e.ci)}</td><td>${esc(normalizarTexto(e.nombre))}</td><td>${esc(normalizarTexto(e.curso))}</td><td>${esc(normalizarTexto(e.paralelo))}</td><td class="acciones-tabla"><button type="button" class="boton-editar" data-editar-estudiante="${e.id}">Editar</button><button type="button" class="boton-eliminar" data-eliminar-estudiante="${e.id}">Eliminar</button></td></tr>`).join('') || '<tr><td colspan="5">No hay estudiantes.</td></tr>';
  tb.querySelectorAll('[data-editar-estudiante]').forEach(b=>b.addEventListener('click',()=>{const e=estudiantes.find(x=>String(x.id)===b.dataset.editarEstudiante);if(e)editarEstudiante(e);}));
  tb.querySelectorAll('[data-eliminar-estudiante]').forEach(b=>b.addEventListener('click',()=>eliminarEstudiante(Number(b.dataset.eliminarEstudiante))));
  aplicarFiltrosEstudiantesV75();
  return estudiantes.length;
}

function cambiarPestaña(tab){
  const ids=['seccionInicio','seccionProfesores','seccionEstudiantes','seccionMaterias','seccionCursos'];
  ids.forEach(id=>{const el=$(id); if(el) el.hidden=id!==`seccion${tab.charAt(0).toUpperCase()+tab.slice(1)}`;});
  if(perfilActual?.rol==='director') {
    ['tabInicio','tabProfesores','tabEstudiantes','tabMaterias','tabCursos'].forEach(id=>$(id)?.classList.remove('filtro-activo'));
    const b=$(`tab${tab.charAt(0).toUpperCase()+tab.slice(1)}`); if(b)b.classList.add('filtro-activo');
  }
  document.querySelectorAll('.gb-side-link').forEach(link=>link.classList.toggle('is-active',link.dataset.tab===tab));
}

function cerrarFormularioInline(tipo){
  const el=$(`formInline${tipo.charAt(0).toUpperCase()+tipo.slice(1)}`);
  if(!el)return;
  el.hidden=true;
  el.innerHTML='';
}

function abrirFormularioInline(tipo, titulo, campos, modo, id=null){
  const el=$(`formInline${tipo.charAt(0).toUpperCase()+tipo.slice(1)}`);
  if(!el)return;
  // Solo un formulario inline abierto a la vez.
  ['profesores','estudiantes','materias','cursos'].forEach(t=>{
    if(t!==tipo) cerrarFormularioInline(t);
  });
  el.innerHTML=`
    <div class="cabecera-form-inline">
      <div><span class="eyebrow">Formulario</span><h3>${esc(titulo)}</h3></div>
      <button type="button" class="boton-cancelar boton-compacto" data-cancelar-formulario="${esc(tipo)}">Cancelar</button>
    </div>
    <form class="formulario-inline-contenido" data-tipo="${esc(tipo)}" data-modo="${esc(modo)}" data-id="${esc(id ?? '')}">
      <div class="form-grid">${campos}</div>
      <div class="botones-formulario">
        <button class="boton-guardar" type="submit">${modo.startsWith('crear')?'Crear':'Guardar cambios'}</button>
        <button class="boton-cancelar" type="button" data-cancelar-formulario="${esc(tipo)}">Cancelar</button>
      </div>
    </form>`;
  el.hidden=false;
  const form=el.querySelector('form');
  form?.addEventListener('submit',event=>guardarInline(event,form.dataset.tipo,form.dataset.modo,form.dataset.id||null));
  el.querySelectorAll('[data-cancelar-formulario]').forEach(btn=>btn.addEventListener('click',()=>cerrarFormularioInline(btn.dataset.cancelarFormulario)));
  configurarMayusculasYCorreo(form);
  requestAnimationFrame(()=>{
    el.querySelector('input,select,textarea')?.focus({preventScroll:true});
    el.scrollIntoView({behavior:'smooth',block:'nearest'});
  });
}


async function prepararSelectorCurso(form, cursoActual = '', paraleloActual = '') {
  const select=form?.querySelector('select[name="curso_id"]');
  if(!select)return;
  select.innerHTML='<option value="">Cargando cursos...</option>';
  select.disabled=true;
  try{
    await cargarCatalogosDirector(false);
    select.innerHTML='<option value="">Seleccionar curso...</option>';
    let selected=null;
    (catalogoDirector.cursos||[]).forEach(c=>{
      const opt=document.createElement('option');
      opt.value=c.id;
      opt.textContent=`${normalizarTexto(c.nombre)} ${normalizarTexto(c.paralelo)}`;
      opt.dataset.nombre=normalizarTexto(c.nombre);
      opt.dataset.paralelo=normalizarTexto(c.paralelo);
      if(String(c.nombre||'').trim().toLocaleUpperCase('es')===String(cursoActual||'').trim().toLocaleUpperCase('es')&&String(c.paralelo||'').trim().toLocaleUpperCase('es')===String(paraleloActual||'').trim().toLocaleUpperCase('es'))selected=c.id;
      select.appendChild(opt);
    });
    if(selected)select.value=selected;
    const sincronizar=()=>{
      const opt=select.selectedOptions[0];
      const curso=form.querySelector('[name="curso"]');
      const paralelo=form.querySelector('[name="paralelo"]');
      if(curso)curso.value=opt?.dataset?.nombre||'';
      if(paralelo)paralelo.value=opt?.dataset?.paralelo||'';
    };
    select.onchange=sincronizar;
    sincronizar();
    select.disabled=false;
  }catch(e){
    console.error(e);
    select.innerHTML='<option value="">Error al cargar cursos</option>';
    select.disabled=true;
  }
}

function abrirProfesor(){
  abrirFormularioInline('profesores','Nuevo profesor',`
    <div class="campo-busqueda"><label>Nombre(s)</label><input name="nombres" data-uppercase="true" autocomplete="given-name" required></div>
    <div class="campo-busqueda"><label>Primer apellido</label><input name="primer_apellido" data-uppercase="true" autocomplete="family-name" required></div>
    <div class="campo-busqueda"><label>Otros apellidos (opcional)</label><input name="otros_apellidos" data-uppercase="true" autocomplete="off"></div>
    <input type="hidden" name="nombre">
    <div class="campo-busqueda"><label>Correo institucional generado</label><input name="email" type="email" data-autogenerado="true" readonly required aria-describedby="ayudaCorreoProfesor"><small id="ayudaCorreoProfesor">Formato: primernombre.primerapellido@gb.edu</small></div>
    <div class="campo-busqueda"><label>Contraseña inicial</label><input name="password" type="password" minlength="8" required></div>
    <div class="campo-busqueda"><label>Curso asignado</label>
      <select name="curso_id" class="form-control curso-selector-director" required>
        <option value="">Cargando cursos...</option>
      </select>
    </div>
    <input type="hidden" name="curso">
    <input type="hidden" name="paralelo">`,
    'crear-profesor');
  const form=document.querySelector('#formInlineProfesores form');
  prepararSelectorCurso(form);
}

function editarProfesor(p){
  abrirFormularioInline('profesores','Editar profesor',`
    <div class="campo-busqueda"><label>Nombre completo</label><input name="nombre" data-uppercase="true" value="${esc(p.nombre)}" required></div>
    <div class="campo-busqueda"><label>Curso asignado</label>
      <select name="curso_id" class="form-control curso-selector-director" required>
        <option value="">Cargando cursos...</option>
      </select>
    </div>
    <input type="hidden" name="curso">
    <input type="hidden" name="paralelo">`,
    'editar-profesor',p.id);
  const form=document.querySelector('#formInlineProfesores form');
  prepararSelectorCurso(form,p.curso_asignado||'',p.paralelo_asignado||'');
}

function abrirEstudiante(e=null){
  const x=e||{};
  abrirFormularioInline('estudiantes',e?'Editar estudiante':'Nuevo estudiante',`
    <div class="campo-busqueda"><label>CI</label><input name="ci" value="${esc(x.ci||'')}" inputmode="numeric" pattern="[0-9]+" maxlength="15" autocomplete="off" required></div>
    <div class="campo-busqueda"><label>Nombre completo</label><input name="nombre" data-uppercase="true" value="${esc(x.nombre||'')}" required></div>
    <div class="campo-busqueda"><label>Curso asignado</label>
      <select name="curso_id" class="form-control curso-selector-director" required>
        <option value="">Cargando cursos...</option>
      </select>
    </div>
    <input type="hidden" name="curso">
    <input type="hidden" name="paralelo">`,
    e?'editar-estudiante':'crear-estudiante',e?.id);
  const form=document.querySelector('#formInlineEstudiantes form');
  prepararSelectorCurso(form,x.curso||'',x.paralelo||'');
}
function editarEstudiante(e){abrirEstudiante(e);}

function abrirMateria(m=null){
  const x=m||{};
  abrirFormularioInline('materias',m?'Editar materia':'Nueva materia',`
    <div class="campo-busqueda"><label>Nombre de la materia</label><input name="nombre" data-uppercase="true" value="${esc(x.nombre||'')}" required></div>
    <div class="campo-busqueda"><label>Campo</label><input name="campo" data-uppercase="true" value="${esc(x.campo||'')}" placeholder="Ej. TÉCNICO HUMANÍSTICO" required></div>`,
    m?'editar-materia':'crear-materia',m?.id);
}
function editarMateria(m){abrirMateria(m);}
function abrirCurso(c=null){
  const x=c||{};
  abrirFormularioInline('cursos',c?'Editar curso':'Nuevo curso',`
    <div class="campo-busqueda"><label>Curso</label><select name="nombre" required>
      <option value="">Seleccionar curso…</option>
      ${['1RO','2DO','3RO','4TO','5TO','6TO'].map(v=>`<option value="${v}" ${String(x.nombre||'').trim().toUpperCase()===v?'selected':''}>${v}</option>`).join('')}
    </select></div>
    <div class="campo-busqueda"><label>Paralelo</label><select name="paralelo" required>
      <option value="">Seleccionar paralelo…</option>
      ${['A','B','C'].map(v=>`<option value="${v}" ${String(x.paralelo||'').trim().toUpperCase()===v?'selected':''}>${v}</option>`).join('')}
    </select></div>`,
    c?'editar-curso':'crear-curso',c?.id);
}
function editarCurso(c){abrirCurso(c);}

function mensajeErrorCRUD(error, accion='guardar'){
  const code=String(error?.code||'');
  const msg=String(error?.message||'').toLowerCase();
  if(msg.includes('ese curso y paralelo ya están registrados')) return 'Ese curso y paralelo ya existen. Selecciona una combinación diferente.';
  if(msg.includes('ya existe un estudiante con ese ci')) return 'Ya hay un estudiante registrado con ese CI. Revisa el número antes de continuar.';
  if(msg.includes('esa materia ya está registrada')) return 'Esa materia ya está registrada. Puedes editar el registro existente.';
  if(code==='23505' || msg.includes('duplicate key') || msg.includes('already exists')) return 'Ya existe un registro con esos datos. Revisa si está duplicado.';
  if(code==='23503' || msg.includes('foreign key')) return 'No se puede completar la operación porque hay registros relacionados.';
  if(msg.includes('network') || msg.includes('fetch')) return 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';
  if(msg.includes('row-level security') || msg.includes('permission denied')) return 'No tienes permisos para realizar esta operación.';
  if(msg.includes('gestionar-profesor') || msg.includes('edge function')) return 'No se pudo completar la operación del profesor. Comprueba la conexión e inténtalo nuevamente.';
  return error?.message || `No se pudo ${accion} el registro. Inténtalo nuevamente.`;
}

async function invocarGestionarProfesor(body){
  const {data,error}=await _supabase.functions.invoke('gestionar-profesor',{
    body,
    headers:{'x-client-info':'sistema-notas-escolares-v7.1'}
  });
  if(error){
    console.error('gestionar-profesor / invoke:',error);
    let detail=error.message||'No se pudo contactar la Edge Function.';
    const ctx=error.context;
    try{
      if(ctx&&typeof ctx.clone==='function'){
        const payload=await ctx.clone().json();
        detail=payload?.error||detail;
      }else if(ctx?.body){
        const payload=typeof ctx.body==='string'?JSON.parse(ctx.body):ctx.body;
        detail=payload?.error||detail;
      }
    }catch(_){}
    if(/failed to send a request|failed to fetch|network/i.test(detail)){
      detail='No se pudo contactar la Edge Function. Comprueba que “gestionar-profesor” esté desplegada en Supabase y revisa sus registros.';
    }
    throw new Error(`Edge Function: ${detail}`);
  }
  if(!data?.ok)throw new Error(data?.error||'La Edge Function no confirmó la operación.');
  return data;
}

async function guardarInline(event,tipo,modo,id){
  event.preventDefault();
  const d=Object.fromEntries(new FormData(event.target).entries());
  const apellidoCorreo=normalizarTexto(d.primer_apellido||'');
  const nombreCorreo=d.nombres!==undefined ? normalizarTexto(d.nombres) : '';
  if(d.nombres !== undefined){
    d.nombres=normalizarTexto(d.nombres);
    d.primer_apellido=normalizarTexto(d.primer_apellido);
    d.otros_apellidos=normalizarTexto(d.otros_apellidos||'');
    d.nombre=[d.nombres,d.primer_apellido,d.otros_apellidos].filter(Boolean).join(' ');
    delete d.nombres; delete d.primer_apellido; delete d.otros_apellidos;
  }
  if('nombre' in d) d.nombre=normalizarTexto(d.nombre);
  if('campo' in d) d.campo=normalizarTexto(d.campo);
  if('curso' in d) d.curso=normalizarTexto(d.curso);
  if('paralelo' in d) d.paralelo=normalizarTexto(d.paralelo);
  if('ci' in d){d.ci=String(d.ci).trim();if(!/^\d{1,15}$/.test(d.ci)){mostrarToast('El CI debe contener únicamente números.','error');return;}}
  if('email' in d) d.email=normalizarCorreo(d.email);
  const boton=event.submitter;
  if(boton){boton.disabled=true;boton.textContent='Guardando...';}
  try{
    if(modo==='crear-curso'||modo==='editar-curso') {
      const {data:existentes,error:consultaError}=await _supabase.from('cursos').select('id,nombre,paralelo');
      if(consultaError)throw consultaError;
      const duplicado=(existentes||[]).some(c=>String(c.nombre||'').trim().toUpperCase()===String(d.nombre||'').trim().toUpperCase() && String(c.paralelo||'').trim().toUpperCase()===String(d.paralelo||'').trim().toUpperCase() && String(c.id)!==String(id||''));
      if(duplicado)throw new Error('Ese curso y paralelo ya están registrados.');
    }
    if(modo==='crear-estudiante'||modo==='editar-estudiante'){
      const {data:coincidencias,error:consultaError}=await _supabase.from('estudiantes').select('id').eq('ci',d.ci);
      if(consultaError)throw consultaError;
      if((coincidencias||[]).some(x=>String(x.id)!==String(id||'')))throw new Error('Ya existe un estudiante con ese CI.');
    }
    if(modo==='crear-materia'||modo==='editar-materia'){
      const {data:coincidencias,error:consultaError}=await _supabase.from('materias').select('id,nombre');
      if(consultaError)throw consultaError;
      if((coincidencias||[]).some(x=>String(x.nombre||'').trim().toUpperCase()===String(d.nombre||'').trim().toUpperCase() && String(x.id)!==String(id||'')))throw new Error('Esa materia ya está registrada.');
    }
    if(modo==='crear-profesor'||modo==='editar-profesor'){
      if(modo==='crear-profesor') d.email=await correoInstitucionalUnico(nombreCorreo,apellidoCorreo);
      const body=modo==='crear-profesor'
        ? {action:'create',...d}
        : {action:'update',id,...d};
      await invocarGestionarProfesor(body);
    }else if(modo==='crear-estudiante'||modo==='editar-estudiante'){
      const q=modo==='crear-estudiante'
        ? _supabase.from('estudiantes').insert([{ci:d.ci,nombre:d.nombre,curso:d.curso,paralelo:d.paralelo}])
        : _supabase.from('estudiantes').update({ci:d.ci,nombre:d.nombre,curso:d.curso,paralelo:d.paralelo}).eq('id',id).select('id').maybeSingle();
      const {data:resultado,error}=await q;if(error)throw error;if(modo.startsWith('editar-')&&!resultado)throw new Error('No se encontró el registro que intentabas actualizar.');
    }else if(modo==='crear-materia'||modo==='editar-materia'){
      const q=modo==='crear-materia'
        ? _supabase.from('materias').insert([{nombre:d.nombre,campo:d.campo}])
        : _supabase.from('materias').update({nombre:d.nombre,campo:d.campo}).eq('id',id).select('id').maybeSingle();
      const {data:resultado,error}=await q;if(error)throw error;if(modo.startsWith('editar-')&&!resultado)throw new Error('No se encontró el registro que intentabas actualizar.');
    }else if(modo==='crear-curso'||modo==='editar-curso'){
      const q=modo==='crear-curso'
        ? _supabase.from('cursos').insert([{nombre:d.nombre,paralelo:d.paralelo}])
        : _supabase.from('cursos').update({nombre:d.nombre,paralelo:d.paralelo}).eq('id',id).select('id').maybeSingle();
      const {data:resultado,error}=await q;if(error)throw error;if(modo.startsWith('editar-')&&!resultado)throw new Error('No se encontró el registro que intentabas actualizar.');
    }
    cerrarFormularioInline(tipo);
    if(tipo==='materias'||tipo==='cursos'){
      await cargarCatalogosDirector(true);
    }
    mostrarToast('Cambios guardados correctamente','success');
    await cargarTodoDirector();
  }catch(e){
    console.error(e);
    mostrarToast(mensajeErrorCRUD(e,'guardar'),'error');
    if(boton){boton.disabled=false;boton.textContent=modo.startsWith('crear')?'Crear':'Guardar cambios';}
  }
}

async function eliminarProfesor(id){
  if(!confirm('¿Eliminar este profesor y su acceso al sistema?'))return;
  try{
    await invocarGestionarProfesor({action:'delete',id});
    mostrarToast('Profesor eliminado','success');
    await cargarTodoDirector();
  }catch(error){
    console.error('Error al eliminar profesor:',error);
    mostrarToast(error?.message||'No se pudo eliminar el profesor.','error');
  }
}
async function eliminarEstudiante(id){
  if(!confirm('¿Eliminar el estudiante y sus calificaciones?'))return;
  const {error}=await _supabase.from('estudiantes').delete().eq('id',id);
  if(error)mostrarToast(error.message,'error');else{mostrarToast('Estudiante eliminado','success');await cargarTodoDirector();}
}
async function eliminarMateria(id){
  if(!confirm('¿Eliminar la materia? Solo será posible si no tiene calificaciones asociadas.'))return;
  if(catalogoDirector.materias) catalogoDirector.materias=catalogoDirector.materias.filter(m=>String(m.id)!==String(id));
  const {error}=await _supabase.from('materias').delete().eq('id',id);
  if(error){await cargarCatalogosDirector(true);mostrarToast(error.message,'error');}else{mostrarToast('Materia eliminada','success');await cargarTodoDirector();}
}
async function eliminarCurso(id){
  if(!confirm('¿Eliminar este curso? Si hay estudiantes o profesores asociados, primero reasígnalos.'))return;
  if(catalogoDirector.cursos) catalogoDirector.cursos=catalogoDirector.cursos.filter(c=>String(c.id)!==String(id));
  const {error}=await _supabase.from('cursos').delete().eq('id',id);
  if(error){await cargarCatalogosDirector(true);mostrarToast(error.message,'error');}else{mostrarToast('Curso eliminado','success');await cargarTodoDirector();}
}





async function cerrarSesion(){await _supabase.auth.signOut();location.reload();}


/* Selectores actuales de curso: prepararSelectorCurso() se encarga de los formularios inline.
   Se retiró el bloque legado V6.7–V6.9: no tenía consumidores en el HTML actual y
   refrescarCursosV69 llamaba a activarSelectoresCursoReales(), función inexistente. */
