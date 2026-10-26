/* Módulo del profesor: navegación, estudiantes, materias y editor de notas.
   Se carga después del módulo de Dirección para conservar el orden de dependencias. */

/* ============================================================
   V7.7 — DASHBOARD PROFESOR
   Flujo: curso asignado → estudiantes → editor de notas.
   No se crea ninguna tabla ni Edge Function nueva. BY ELY
   ============================================================ */
let profesorEstudiantesV77 = [];
let profesorMateriasV77 = [];
let profesorCalificacionesV77 = new Map();
let profesorMenuConfiguradoV77 = false;
let profesorCargaEnCursoV77 = false;

function sincronizarNavegacionProfesorV77(){
  const movil=window.matchMedia('(max-width: 720px)').matches;
  const btn=$('btnMenuProfesorV77');
  const sidebar=$('sidebarProfesorDashboard');
  if(btn)btn.hidden=!movil;
  if(sidebar)sidebar.hidden=movil;
}

async function abrirPerfilProfesorV77(){
  const {data:{user},error:authError}=await _supabase.auth.getUser();
  if(authError||!user)return mostrarToast('No se pudo abrir el perfil de la sesión actual.','error');
  const {data:p,error}=await _supabase.from('perfiles').select('nombre,rol').eq('id',user.id).maybeSingle();
  if(error)return mostrarToast(error.message,'error');
  $('perfilNombreV75').value=p?.nombre||user.user_metadata?.nombre||perfilActual?.nombre||'';
  // Reutiliza el diálogo y el guardado de perfil ya existentes, sin modificar el esquema.
  $('perfilDirectorV75').hidden=false;
}

function configurarMenuProfesorV77(){
  if(profesorMenuConfiguradoV77){sincronizarNavegacionProfesorV77();return;}
  profesorMenuConfiguradoV77=true;
  const btn=$('btnMenuProfesorV77'), overlay=$('menuProfesorV77');
  const close=$('cerrarMenuProfesorV77'), logout=$('cerrarSesionProfesorV77');
  const cerrar=()=>{
    if(overlay)overlay.hidden=true;
    btn?.setAttribute('aria-expanded','false');
    document.body.classList.remove('v77-menu-open');
  };
  const abrir=()=>{
    if(!overlay||!btn)return;
    overlay.hidden=false;
    btn.setAttribute('aria-expanded','true');
    document.body.classList.add('v77-menu-open');
    close?.focus({preventScroll:true});
  };
  overlay?.querySelectorAll('[data-profesor-accion]').forEach(b=>b.addEventListener('click',()=>{
    ejecutarAccionProfesorV77(b.dataset.profesorAccion);
    cerrar();
  }));
  $('sidebarProfesorDashboard')?.querySelectorAll('[data-profesor-accion]').forEach(b=>b.addEventListener('click',()=>{
    ejecutarAccionProfesorV77(b.dataset.profesorAccion);
    $('sidebarProfesorDashboard')?.querySelectorAll('[data-profesor-accion]').forEach(x=>x.classList.toggle('is-active',x===b));
  }));
  btn?.addEventListener('click',()=>overlay?.hidden?abrir():cerrar());
  close?.addEventListener('click',cerrar);
  overlay?.addEventListener('click',e=>{if(e.target===overlay)cerrar();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay&&!overlay.hidden)cerrar();});
  logout?.addEventListener('click',cerrarSesion);
  $('cerrarSesionProfesorSidebarV77')?.addEventListener('click',cerrarSesion);
  window.addEventListener('resize',sincronizarNavegacionProfesorV77,{passive:true});
  sincronizarNavegacionProfesorV77();
}

function ejecutarAccionProfesorV77(accion){
  if(accion==='actualizar'){
    cargarDashboardProfesorV77(true);
    return;
  }
  if(accion==='perfil'){
    abrirPerfilProfesorV77();
    return;
  }
  if(accion==='notas'){
    if(!profesorEstudiantesV77.length){
      mostrarToast('Primero deben cargarse los estudiantes del curso.','info');
      $('seccionEstudiantesProfesorV77')?.scrollIntoView({behavior:'smooth',block:'start'});
      return;
    }
    if(!profesorMateriasV77.length){
      mostrarToast('No hay materias disponibles para el curso asignado.','info');
      return;
    }
    prepararEditorProfesorV77(
      Number($('editorEstudianteV77')?.value)||profesorEstudiantesV77[0].id,
      Number($('editorMateriaV77')?.value)||profesorMateriasV77[0].id
    );
    $('editorNotasProfesorV77')?.scrollIntoView({behavior:'smooth',block:'start'});
    return;
  }
  const destinos={
    inicio:$('resumenProfesorV77'),
    estudiantes:$('seccionEstudiantesProfesorV77')
  };
  destinos[accion]?.scrollIntoView({behavior:'smooth',block:'start'});
}

function normalizarTextoProfesorV77(valor){
  return String(valor??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/\b(?:de|del|la|el|secundaria|secundario|ano|anos|año|años|curso|grado)\b/g,' ')
    .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}

function obtenerGradoProfesorV77(valor){
  const t=normalizarTextoProfesorV77(valor);
  const palabras={primero:1,primer:1,segundo:2,tercero:3,tercer:3,cuarto:4,quinto:5,sexto:6};
  for(const [palabra,grado] of Object.entries(palabras))if(new RegExp(`\\b${palabra}\\b`).test(t))return grado;
  const m=String(valor??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .match(/(?:^|\D)([1-6])\s*(?:ro|do|to|ero|er|º|°)?(?:\s|$|\.)/);
  return m?Number(m[1]):0;
}

function cursoCoincideProfesorV77(a,b){
  const ga=obtenerGradoProfesorV77(a),gb=obtenerGradoProfesorV77(b);
  if(ga&&gb)return ga===gb;
  const na=normalizarTextoProfesorV77(a),nb=normalizarTextoProfesorV77(b);
  return !!na&&na===nb;
}

function paraleloCoincideProfesorV77(a,b){
  const normalizar=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/^PARALELO\s*/,'');
  return !!normalizar(a)&&normalizar(a)===normalizar(b);
}

function filtrarMateriasProfesorPorCursoV77(materias, curso){
  const grado=obtenerGradoProfesorV77(curso);
  const tecnicaEsperada=grado>=1&&grado<=3?'ttg':grado>=4&&grado<=6?'tte':null;
  return (materias||[]).filter(m=>{
    const n=normalizarTextoProfesorV77(m.nombre);
    const esTTG=/\bttg\b|tecnica tecnologica general/.test(n);
    const esTTE=/\btte\b|tecnica tecnologica especializada/.test(n);
    if(esTTG||esTTE)return tecnicaEsperada==='ttg'?esTTG:tecnicaEsperada==='tte'?esTTE:false;
    return true;
  });
}

function mostrarEstadoSinAsignacionProfesorV77(lista,curso,paralelo,cursos,errorCurso){
  const asignacion=`${String(curso||'Sin curso').trim()} ${String(paralelo||'').trim()}`.trim();
  const cursoExiste=(cursos||[]).some(c=>cursoCoincideProfesorV77(c.nombre,curso)&&paraleloCoincideProfesorV77(c.paralelo,paralelo));
  $('contadorEstudiantesV77').textContent='0 estudiantes';
  $('editorNotasProfesorV77').hidden=true;
  lista.innerHTML=`<div class="notificacion notificacion-warning"><strong>No se encontraron estudiantes para ${esc(asignacion)}.</strong><br>${errorCurso?'No se pudo verificar el catálogo de cursos. ':''}${cursoExiste?'El curso aparece en el catálogo, pero no se recibieron estudiantes visibles para esta asignación.':'Comprueba que la asignación del perfil use el mismo curso y paralelo registrados en el sistema.'}<br><small>Por seguridad, el panel no mostrará estudiantes de otros cursos.</small></div>`;
}

async function cargarDashboardProfesorV77(forzar=false){
  const lista=$('listaEstudiantesProfesorV77');
  if(!lista||profesorCargaEnCursoV77)return;
  if(!forzar&&profesorEstudiantesV77.length&&profesorMateriasV77.length)return;
  if(typeof _supabase==='undefined'||!_supabase){
    lista.innerHTML='<div class="notificacion notificacion-error">No se pudo iniciar la conexión con la base de datos.</div>';
    return;
  }
  profesorCargaEnCursoV77=true;
  lista.innerHTML='<div class="estado-carga">Cargando los datos de tu curso…</div>';
  const curso=perfilActual?.curso_asignado;
  const paralelo=perfilActual?.paralelo_asignado;
  try{
    if(!curso||!paralelo){
      lista.innerHTML='<div class="notificacion notificacion-warning"><strong>Tu cuenta todavía no tiene un curso y paralelo asignados.</strong><br>Solicita al director que revise la asignación de tu perfil.</div>';
      $('contadorEstudiantesV77').textContent='0 estudiantes';
      $('editorNotasProfesorV77').hidden=true;
      return;
    }

    const [re,rm,rc]=await Promise.all([
      _supabase.from('estudiantes').select('id,ci,nombre,curso,paralelo').order('nombre'),
      _supabase.from('materias').select('id,nombre,campo').order('nombre'),
      _supabase.from('cursos').select('id,nombre,paralelo').order('nombre')
    ]);
    if(re.error)throw new Error(`Estudiantes: ${re.error.message}`);
    if(rm.error)throw new Error(`Materias: ${rm.error.message}`);

    const estudiantesVisibles=re.data||[];
    // La consulta sigue protegida por las políticas existentes. Este filtro adicional evita
    // mostrar accidentalmente registros de otro curso si la política de lectura es amplia.
    profesorEstudiantesV77=estudiantesVisibles.filter(e=>
      cursoCoincideProfesorV77(e.curso,curso)&&paraleloCoincideProfesorV77(e.paralelo,paralelo)
    );
    profesorMateriasV77=filtrarMateriasProfesorPorCursoV77(rm.data||[],curso);
    $('contadorEstudiantesV77').textContent=`${profesorEstudiantesV77.length} ${profesorEstudiantesV77.length===1?'estudiante':'estudiantes'}`;
    $('profesorCursoV77').textContent=`${curso} ${paralelo}`.trim();

    if(!profesorEstudiantesV77.length){
      mostrarEstadoSinAsignacionProfesorV77(lista,curso,paralelo,rc.data,!!rc.error);
      return;
    }

    const ids=profesorEstudiantesV77.map(e=>e.id);
    const {data:cal,error:ec}=await _supabase.from('calificaciones')
      .select('id,estudiante_id,materia_id,trimestre_1,trimestre_2,trimestre_3')
      .in('estudiante_id',ids);
    if(ec)throw new Error(`Calificaciones: ${ec.message}`);
    profesorCalificacionesV77=new Map((cal||[]).map(c=>[`${c.estudiante_id}-${c.materia_id}`,c]));
    renderListaEstudiantesProfesorV77();
    if(profesorMateriasV77.length){
      prepararEditorProfesorV77(profesorEstudiantesV77[0].id,profesorMateriasV77[0].id,false);
    }else{
      $('editorNotasProfesorV77').hidden=true;
    }
  }catch(e){
    console.error('Error al cargar panel de profesor:',e);
    lista.innerHTML=`<div class="notificacion notificacion-error"><strong>No se pudieron cargar los datos del curso.</strong><br>${esc(e.message||'Error de conexión.')}<br><small>Revisa la consola del navegador para ver el detalle técnico.</small></div>`;
    mostrarToast('No se pudo cargar el panel del profesor','error');
  }finally{
    profesorCargaEnCursoV77=false;
  }
}

function renderListaEstudiantesProfesorV77(){
  const lista=$('listaEstudiantesProfesorV77');
  if(!lista)return;
  const q=normalizarTextoProfesorV77($('buscarEstudianteProfesorV77')?.value||'');
  const filtrados=profesorEstudiantesV77.filter(e=>{
    const nombre=normalizarTextoProfesorV77(e.nombre);
    const ci=String(e.ci||'').toLowerCase().trim();
    return !q||nombre.includes(q)||ci.includes(String($('buscarEstudianteProfesorV77')?.value||'').toLowerCase().trim());
  });
  if(!filtrados.length){lista.innerHTML='<div class="estado-vacio-v77">No se encontraron estudiantes con esa búsqueda.</div>';return;}
  lista.innerHTML=filtrados.map(e=>`
    <article class="estudiante-item-v77">
      <div class="estudiante-identidad-v77"><span class="avatar-estudiante-v77">${esc(String(e.nombre||'?').trim().charAt(0).toUpperCase())}</span><div><strong>${esc(e.nombre)}</strong><small>CI ${esc(e.ci||'—')}</small></div></div>
      <button type="button" class="boton-notas-v77" data-estudiante="${e.id}">Ver notas</button>
    </article>`).join('');
  lista.querySelectorAll('[data-estudiante]').forEach(btn=>btn.addEventListener('click',()=>{
    const firstMateria=Number($('editorMateriaV77')?.value)||profesorMateriasV77[0]?.id;
    prepararEditorProfesorV77(Number(btn.dataset.estudiante),firstMateria);
  }));
}

function prepararEditorProfesorV77(estudianteId,materiaId,scroll=true){
  const editor=$('editorNotasProfesorV77');
  if(!editor)return;
  const estudiante=profesorEstudiantesV77.find(e=>Number(e.id)===Number(estudianteId));
  if(!estudiante){mostrarToast('Selecciona un estudiante de tu curso.','info');return;}
  if(!profesorMateriasV77.length){mostrarToast('No hay materias para este curso.','info');return;}
  const selE=$('editorEstudianteV77'),selM=$('editorMateriaV77');
  if(!selE||!selM)return;
  selE.innerHTML=profesorEstudiantesV77.map(e=>`<option value="${e.id}">${esc(e.nombre)} — CI ${esc(e.ci||'—')}</option>`).join('');
  selM.innerHTML=profesorMateriasV77.map(m=>`<option value="${m.id}">${esc(m.nombre)}${m.campo?` — ${esc(m.campo)}`:''}</option>`).join('');
  selE.value=String(estudianteId);
  if(profesorMateriasV77.some(m=>Number(m.id)===Number(materiaId)))selM.value=String(materiaId);
  editor.hidden=false;
  cargarNotasEditorProfesorV77();
  if(scroll)editor.scrollIntoView({behavior:'smooth',block:'start'});
}

function cargarNotasEditorProfesorV77(){
  const estudianteId=Number($('editorEstudianteV77')?.value);
  const materiaId=Number($('editorMateriaV77')?.value);
  const c=profesorCalificacionesV77.get(`${estudianteId}-${materiaId}`)||{};
  ['1','2','3'].forEach(t=>{const input=$(`nota${t}V77`);if(input)input.value=c[`trimestre_${t}`]??'';});
  actualizarPromedioProfesorV77();
  const estado=$('estadoEditorV77');if(estado)estado.textContent='';
}

function actualizarPromedioProfesorV77(){
  const vals=['1','2','3'].map(t=>{const v=$(`nota${t}V77`)?.value;return v===''||v==null?null:Number(v);});
  const promedio=$('promedioV77');if(!promedio)return;
  if(vals.some(v=>v===null||Number.isNaN(v))){promedio.textContent='—';return;}
  const n=(vals[0]+vals[1]+vals[2])/3;
  promedio.textContent=Number.isInteger(n)?String(n):n.toFixed(2);
}

function obtenerPayloadNotasProfesorV77(){
  const estudianteId=Number($('editorEstudianteV77')?.value);
  const materiaId=Number($('editorMateriaV77')?.value);
  if(!profesorEstudiantesV77.some(e=>Number(e.id)===estudianteId))throw new Error('El estudiante no pertenece al curso asignado.');
  if(!profesorMateriasV77.some(m=>Number(m.id)===materiaId))throw new Error('La materia no corresponde al curso asignado.');
  const payload={estudiante_id:estudianteId,materia_id:materiaId};
  ['1','2','3'].forEach(t=>{const value=$(`nota${t}V77`)?.value;payload[`trimestre_${t}`]=value===''||value==null?null:Number(value);});
  for(const v of Object.values(payload).slice(2)){
    if(v!==null&&(!Number.isInteger(v)||v<0||v>100))throw new Error('Las notas deben ser números enteros entre 0 y 100.');
  }
  return payload;
}

async function guardarNotasProfesorV77(){
  const button=$('guardarNotaProfesorV77');
  try{
    const payload=obtenerPayloadNotasProfesorV77();
    if(!payload.estudiante_id||!payload.materia_id)return;
    button.disabled=true;button.textContent='Guardando…';$('estadoEditorV77').textContent='';
    const {data,error}=await _supabase.from('calificaciones')
      .upsert(payload,{onConflict:'estudiante_id,materia_id'})
      .select('id,estudiante_id,materia_id,trimestre_1,trimestre_2,trimestre_3').single();
    if(error)throw error;
    profesorCalificacionesV77.set(`${payload.estudiante_id}-${payload.materia_id}`,data);
    cargarNotasEditorProfesorV77();
    $('estadoEditorV77').textContent='Calificaciones guardadas correctamente.';
    mostrarToast('Calificaciones guardadas correctamente','success');
  }catch(e){
    console.error(e);if($('estadoEditorV77'))$('estadoEditorV77').textContent=e.message||'No se pudieron guardar las notas.';
    mostrarToast(e.message||'No se pudieron guardar las notas','error');
  }finally{if(button){button.disabled=false;button.textContent='Guardar calificaciones';}}
}

async function limpiarNotasProfesorV77(){
  const button=$('limpiarNotasProfesorV77');
  const estudianteId=Number($('editorEstudianteV77')?.value);
  const materiaId=Number($('editorMateriaV77')?.value);
  if(!profesorEstudiantesV77.some(e=>Number(e.id)===estudianteId)||!profesorMateriasV77.some(m=>Number(m.id)===materiaId)){
    mostrarToast('Selecciona un estudiante y una materia válidos.','error');return;
  }
  const payload={estudiante_id:estudianteId,materia_id:materiaId};
  const estudiante=profesorEstudiantesV77.find(e=>Number(e.id)===payload.estudiante_id);
  const materia=profesorMateriasV77.find(m=>Number(m.id)===payload.materia_id);
  if(!confirm(`¿Borrar las tres calificaciones de ${estudiante?.nombre||'este estudiante'} en ${materia?.nombre||'esta materia'}?`))return;
  button.disabled=true;button.textContent='Borrando…';
  try{
    const limpio={estudiante_id:payload.estudiante_id,materia_id:payload.materia_id,trimestre_1:null,trimestre_2:null,trimestre_3:null};
    const {data,error}=await _supabase.from('calificaciones').upsert(limpio,{onConflict:'estudiante_id,materia_id'})
      .select('id,estudiante_id,materia_id,trimestre_1,trimestre_2,trimestre_3').single();
    if(error)throw error;
    profesorCalificacionesV77.set(`${limpio.estudiante_id}-${limpio.materia_id}`,data);
    cargarNotasEditorProfesorV77();
    $('estadoEditorV77').textContent='Se borraron las calificaciones de esta materia.';
    mostrarToast('Calificaciones borradas','success');
  }catch(e){
    console.error(e);$('estadoEditorV77').textContent=e.message||'No se pudieron borrar las notas.';
    mostrarToast(e.message||'No se pudieron borrar las notas','error');
  }finally{button.disabled=false;button.textContent='Borrar notas de esta materia';}
}

document.addEventListener('input',e=>{
  if(e.target.matches('#buscarEstudianteProfesorV77'))renderListaEstudiantesProfesorV77();
  if(e.target.matches('#nota1V77,#nota2V77,#nota3V77'))actualizarPromedioProfesorV77();
});
document.addEventListener('change',e=>{
  if(e.target.matches('#editorEstudianteV77,#editorMateriaV77'))cargarNotasEditorProfesorV77();
});
document.addEventListener('click',e=>{
  if(e.target.id==='guardarNotaProfesorV77')guardarNotasProfesorV77();
  if(e.target.id==='limpiarNotasProfesorV77')limpiarNotasProfesorV77();
});
