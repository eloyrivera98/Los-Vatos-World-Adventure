import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { AuthView } from '@neondatabase/neon-js/auth/react/ui'
import { authClient, neonAuth } from './auth'
import { activityLabel, formatDate, formatDateTime, mapLanguage } from './i18n'
import {
  Activity, ArrowLeft, BarChart3, Bell, Camera, Check, ChevronRight, CircleHelp,
  Clock3, Compass, Crosshair, EyeOff, Flag, Globe2, Home, LocateFixed, LockKeyhole,
  Map as MapIcon, MapPin, Menu, Navigation, Plus, Route, ScanLine, Search, Settings, LogOut,
  ShieldCheck, Sparkles, Trophy, UserRound, Users, X, Zap
} from 'lucide-react'

type Page = 'map' | 'activity' | 'scan' | 'collection' | 'stats' | 'profile'
type Discovery={id:string;name:string;avatar?:string;at:string}
type Pin={id:string;number:number;city:string;country:string;lng:number;lat:number;count:number;author:string;authorAvatar?:string;date:string;title?:string;story?:string;message?:string;photo?:string;color:string;owned:boolean;collected:boolean;hintUnlocked:boolean;cityCount:number;discoveries:Discovery[]}
type Member={id:string;display_name:string;username?:string;avatar_url?:string;role:string}
type Profile={id:string;display_name:string;username?:string;avatar_url?:string;created_at:string;onboarding_completed:boolean}
type ActivityRow={id:string;activity_type:string;created_at:string;actor:string;avatar_url?:string;city?:string}
type NotificationRow={id:string;type:string;title:string;body:string;created_at:string;read_at?:string;sticker_id?:string}
type LiveData={profile:Profile|null;group:{id:string;name:string;role:string}|null;members:Member[];pins:Pin[];activities:ActivityRow[];notifications:NotificationRow[];stats:{activated:number;discovered:number;hidden:number;discoveries:number}}
const emptyData:LiveData={profile:null,group:null,members:[],pins:[],activities:[],notifications:[],stats:{activated:0,discovered:0,hidden:0,discoveries:0}}
const DataContext=createContext<LiveData>(emptyData)
const useLiveData=()=>useContext(DataContext)
const pinColors=['#ff5c45','#f5b73b','#17a27d','#6c63ff']
async function readApiResponse(response:Response){
  const text=await response.text()
  let data:any
  try{data=text?JSON.parse(text):{}}
  catch{throw new Error(response.status===404?'La API no está disponible. En Render debes desplegar el proyecto como Web Service, no como Static Site.':'El servidor ha devuelto una respuesta no válida. Revisa los registros de Render.')}
  if(!response.ok)throw new Error(data?.error||`Error del servidor (${response.status})`)
  return data
}
function Avatar({src,name,className='' }:{src?:string;name:string;className?:string}){return src?<img className={className} src={src} alt={name}/>:<span className={'avatar-fallback '+className}>{name.trim().charAt(0).toUpperCase()||'V'}</span>}
function Logo({ compact=false, onMarkTap }: { compact?:boolean; onMarkTap?:()=>void }) {
  return <div className="logo"><span className={'logo-mark '+(onMarkTap?'logo-secret-trigger':'')} onPointerUp={onMarkTap}><MapPin size={compact?17:20} strokeWidth={2.7}/><i/></span>{!compact && <span>Los Vatos World Adventure</span>}</div>
}

function PublicCover({onSecretTap}:{onSecretTap:()=>void}){
  return <main className="public-cover">
    <header className="cover-header"><Logo onMarkTap={onSecretTap}/><span>Una aventura privada entre amigos</span></header>
    <section className="cover-hero">
      <div className="cover-copy"><span className="eyebrow">VIAJA · ENCUENTRA · COLECCIONA</span><h1>Cada ciudad esconde una <em>historia compartida.</em></h1><p>Los Vatos World Adventure es un álbum de viaje privado. Dejamos cromos físicos por el mundo: conoces la ciudad, desbloqueas una fotografía al llegar y utilizas esa pista para encontrar la pegatina.</p><div className="cover-purpose"><ShieldCheck/><div><b>La ubicación exacta siempre permanece secreta</b><span>Solo al escanear físicamente el cromo se revelan su historia, su mensaje y el recuerdo completo, que pasa a tu colección.</span></div></div></div>
      <div className="cover-visual" aria-hidden="true"><div className="cover-card cover-card-one"><span>LOS VATOS · #001</span><strong>Atardecer en Lisboa</strong><small>Cromo coleccionado</small></div><div className="cover-card cover-card-two"><span>LOS VATOS · #002</span><Camera/><strong>Foto-pista desbloqueada</strong><small>Granada · ubicación secreta</small></div><div className="cover-route"><MapPin/><i/><Sparkles/></div></div>
    </section>
    <section className="cover-steps"><article><span>01</span><MapPin/><h2>Activa un cromo</h2><p>Elige un título, añade una foto, un mensaje y una historia. El grupo sabrá únicamente en qué ciudad se encuentra.</p></article><article><span>02</span><LocateFixed/><h2>Entra en la ciudad</h2><p>Al abrir la aplicación allí, la foto se desbloquea automáticamente como pista. La posición exacta sigue oculta.</p></article><article><span>03</span><ScanLine/><h2>Encuentra la pegatina</h2><p>Sigue la pista y escanea el cromo físico. Entonces se revelan el mensaje, la historia y todos sus datos.</p></article><article><span>04</span><Sparkles/><h2>Añádelo a tu colección</h2><p>El cromo queda guardado en tu álbum para que puedas volver a consultar el recuerdo cuando quieras.</p></article></section>
    <footer><Logo compact/><span>Los Vatos World Adventure · Aventura privada</span></footer>
  </main>
}

function LoginScreen({onHide}:{onHide:()=>void}){
  const path=window.location.pathname.split('/').filter(Boolean).pop() || 'sign-in'
  return <main className="auth-screen"><section className="auth-brand"><Logo/><div><span className="eyebrow">VIAJA · ENCUENTRA · COLECCIONA</span><h1>El mundo está lleno de historias.<br/><em>Sal a encontrarlas.</em></h1><p>Una aventura privada entre amigos, un cromo en cada lugar.</p></div><div className="auth-orbit"><MapPin/><Sparkles/><Globe2/></div></section><section className="auth-form-panel"><button className="hide-access" onClick={onHide} aria-label="Volver a la portada"><X/></button><div className="auth-mobile-logo"><Logo/></div><div className="auth-card"><span className="eyebrow">BIENVENIDO, VATO</span><AuthView pathname={path}/></div><small>Al continuar aceptas formar parte de esta aventura privada.</small></section></main>
}

function AccessGate(){
  const [revealed,setRevealed]=useState(()=>sessionStorage.getItem('lvwa-access')==='open')
  const taps=useRef<number[]>([])
  const secretTap=()=>{const now=Date.now();taps.current=[...taps.current.filter(time=>now-time<4000),now];if(taps.current.length>=5){sessionStorage.setItem('lvwa-access','open');setRevealed(true);taps.current=[]}}
  const hide=()=>{sessionStorage.removeItem('lvwa-access');setRevealed(false)}
  return revealed?<LoginScreen onHide={hide}/>:<PublicCover onSecretTap={secretTap}/>
}

function App() {
  const {data:session,isPending}=authClient.useSession()
  const [page, setPage] = useState<Page>('map')
  const [selected, setSelected] = useState<Pin | null>(null)
  const [scanOpen, setScanOpen] = useState(false)
  const [notice, setNotice] = useState(false)
  const [cityHints,setCityHints]=useState<any[]>([])
  const [zoom, setZoom] = useState(1)
  const [liveData,setLiveData]=useState<LiveData>(emptyData)
  const [dataPending,setDataPending]=useState(false)
  const [dataError,setDataError]=useState('')
  useEffect(()=>{
    if(!session?.user){setLiveData(emptyData);return}
    let cancelled=false
    setDataPending(true);setDataError('')
    neonAuth.getJWTToken().then(token=>fetch('/api/bootstrap',{headers:{Authorization:`Bearer ${token}`}})).then(readApiResponse).then(raw=>{
      if(cancelled)return
      const realPins:Pin[]=raw.stickers.map((item:any,index:number)=>({id:item.id,number:Number(item.sticker_number),city:item.city||'Lugar sin nombre',country:item.country||'',lng:Number(item.lng),lat:Number(item.lat),count:Number(item.discovery_count),author:item.author,authorAvatar:item.author_avatar,date:formatDate(item.activated_at),title:item.title||undefined,story:item.story||undefined,message:item.message||undefined,photo:item.photo_url||undefined,color:pinColors[index%pinColors.length],owned:item.owned,collected:item.collected,hintUnlocked:Boolean(item.hint_unlocked),cityCount:Number(item.city_count||1),discoveries:item.discoveries||[]}))
      setLiveData({profile:raw.profile,group:raw.group,members:raw.members,pins:realPins,activities:raw.activities,notifications:raw.notifications||[],stats:raw.stats});getPreciseLocation().then(async position=>{const token=await neonAuth.getJWTToken();const response=await fetch('/api/hints/city',{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy})});const result=await readApiResponse(response);if(!cancelled&&result.hints?.length)setCityHints(result.hints)}).catch(()=>{})
    }).catch(error=>!cancelled&&setDataError(error.message)).finally(()=>!cancelled&&setDataPending(false))
    return()=>{cancelled=true}
  },[session?.user?.id])
  const collected=liveData.pins.filter(pin=>pin.collected||pin.owned).map(pin=>pin.id)

  if(isPending) return <div className="auth-loading"><span/><Logo/></div>
  if(!session?.user) return <AccessGate/>
  if(dataPending) return <div className="auth-loading"><span/><p>Cargando tu aventura real…</p></div>
  if(dataError) return <DataUnavailable message={dataError}/>

  const navigate = (p:Page) => { setPage(p); setSelected(null); if(p==='scan') setScanOpen(true) }
  return <DataContext.Provider value={liveData}><div className="app-shell">
    <aside className="sidebar">
      <Logo />
      <nav>
        <NavItem icon={<MapIcon/>} label="Mapa" active={page==='map'} onClick={()=>navigate('map')}/>
        <NavItem icon={<Activity/>} label="Actividad" active={page==='activity'} onClick={()=>navigate('activity')} badge={liveData.activities.length?String(liveData.activities.length):undefined}/>
        <button className="scan-nav" onClick={()=>setScanOpen(true)}><span><ScanLine/></span>Escanear</button>
        <NavItem icon={<Sparkles/>} label="Mi colección" active={page==='collection'} onClick={()=>navigate('collection')} badge={String(collected.length)}/>
        <NavItem icon={<BarChart3/>} label="Estadísticas" active={page==='stats'} onClick={()=>navigate('stats')}/>
        <NavItem icon={<UserRound/>} label="Mi perfil" active={page==='profile'} onClick={()=>navigate('profile')}/>
      </nav>
      <div className="side-bottom">
        <div className="mini-user"><Avatar src={liveData.profile?.avatar_url||session.user.image||undefined} name={liveData.profile?.display_name||session.user.name}/><div><b>{liveData.profile?.display_name||session.user.name}</b><small>{liveData.profile?.username?`@${liveData.profile.username}`:session.user.email}</small></div></div>

      </div>
    </aside>

    <main className="main">
      {page==='map' && <MapPage selected={selected} setSelected={setSelected} zoom={zoom} setZoom={setZoom} onNotice={()=>setNotice(!notice)}/>} 
      {page==='activity' && <ActivityPage/>}
      {page==='collection' && <CollectionPage collected={collected}/>} 
      {page==='stats' && <StatsPage/>}
      {page==='profile' && <ProfilePage/>}
    </main>

    <nav className="mobile-nav">
      <MobileItem icon={<MapIcon/>} label="Mapa" active={page==='map'} onClick={()=>navigate('map')}/>
      <MobileItem icon={<Activity/>} label="Actividad" active={page==='activity'} onClick={()=>navigate('activity')}/>
      <button className="mobile-scan" aria-label="Escanear" onClick={()=>setScanOpen(true)}><ScanLine/></button>
      <MobileItem icon={<Sparkles/>} label="Cromos" active={page==='collection'} onClick={()=>navigate('collection')}/>
      <MobileItem icon={<UserRound/>} label="Perfil" active={page==='profile'} onClick={()=>navigate('profile')}/>
    </nav>
    {selected && <StickerPanel pin={selected} owned={collected.includes(selected.id)} onClose={()=>setSelected(null)}/>} 
    {scanOpen && <ScanFlow onCollect={()=>{}} onClose={()=>{setScanOpen(false); if(page==='scan') setPage('map')}}/>}
    {notice && <NotificationPanel notifications={liveData.notifications} onClose={()=>setNotice(false)}/>} {cityHints.length>0&&<CityHintModal hints={cityHints} onClose={()=>{setCityHints([]);window.location.reload()}}/>} 
    {dataError&&<div className="data-error">{dataError}</div>}
  </div></DataContext.Provider>
}

function DataUnavailable({message}:{message:string}){return <main className="data-unavailable"><section><span><X/></span><h1>No podemos cargar tu aventura</h1><p>{message}</p><div><button className="primary" onClick={()=>window.location.reload()}>Volver a intentar</button><button className="text-btn" onClick={()=>authClient.signOut()}>Cerrar sesión</button></div></section></main>}
function NavItem({icon,label,active,onClick,badge}:{icon:React.ReactNode,label:string,active:boolean,onClick:()=>void,badge?:string}) {
  return <button className={'nav-item '+(active?'active':'')} onClick={onClick}>{icon}<span>{label}</span>{badge&&<em>{badge}</em>}</button>
}
function MobileItem({icon,label,active,onClick}:{icon:React.ReactNode,label:string,active:boolean,onClick:()=>void}) {
  return <button className={active?'active':''} onClick={onClick}>{icon}<small>{label}</small></button>
}

function MapPage({selected,setSelected,onNotice}:{selected:Pin|null,setSelected:(p:Pin)=>void,zoom:number,setZoom:(n:number)=>void,onNotice:()=>void}) {
  const {pins,members,stats}=useLiveData()
  const [query,setQuery] = useState('')
  const [participantsOpen,setParticipantsOpen] = useState(false)
  const mapNode = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const visiblePins = useMemo(()=>pins.filter(p=>(p.city+' '+p.country).toLowerCase().includes(query.toLowerCase())),[pins,query])
  const cityPins=useMemo(()=>Array.from(new Map(visiblePins.map(pin=>[(pin.city+'|'+pin.country).toLowerCase(),pin])).values()),[visiblePins])

  useEffect(()=>{
    if(!mapNode.current || map.current) return
    const instance = new maplibregl.Map({
      container: mapNode.current, center:[-3.7,40.25], zoom:5.1, minZoom:2, maxZoom:19,
      attributionControl:false,
      style:'https://tiles.openfreemap.org/styles/positron'
    })
    instance.on('style.load',()=>{
      // Prioriza la traducción española disponible en OpenStreetMap y conserva
      // el nombre internacional o local cuando todavía no existe name:es.
      for(const layer of instance.getStyle().layers ?? []){
        const textField=layer.type==='symbol'?layer.layout?.['text-field']:undefined
        if(textField && JSON.stringify(textField).includes('name')){
          instance.setLayoutProperty(layer.id,'text-field',['coalesce',['get','name:'+mapLanguage],['get','name:latin'],['get','name']])
        }
      }
    })
    instance.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'top-right')
    instance.addControl(new maplibregl.GeolocateControl({positionOptions:{enableHighAccuracy:true},trackUserLocation:true}),'top-right')
    instance.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right')
    map.current=instance
    return()=>{instance.remove();map.current=null}
  },[])

  useEffect(()=>{
    if(!map.current) return
    markers.current.forEach(marker=>marker.remove())
    markers.current=cityPins.map(pin=>{
      const el=document.createElement('button')
      el.className='real-pin'+(selected?.id===pin.id?' selected':'')
      el.style.setProperty('--pin-color',pin.color)
      el.setAttribute('aria-label',`Abrir pegatina en ${pin.city}`)
      el.innerHTML=`<span><svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span>${pin.cityCount>1?`<b>${pin.cityCount}</b>`:''}`
      el.onclick=()=>{setSelected(pin);map.current?.flyTo({center:[pin.lng,pin.lat],zoom:13,offset:[-150,0],duration:900})}
      return new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([pin.lng,pin.lat]).addTo(map.current!)
    })
  },[cityPins,selected?.id,setSelected])

  const searchPlace=(e:React.FormEvent)=>{
    e.preventDefault()
    const value=query.trim().toLowerCase()
    const match=pins.find(p=>(p.city+' '+p.country).toLowerCase().includes(value))
    if(match){map.current?.flyTo({center:[match.lng,match.lat],zoom:13,duration:1200});setSelected(match)}
    else if(!value) map.current?.flyTo({center:[-3.7,40.25],zoom:5.1,duration:900})
  }
  return <section className="map-page">
    <header className="map-header">
      <div className="mobile-logo"><Logo compact/></div>
      <form className="search" onSubmit={searchPlace}><Search/><input aria-label="Buscar" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Busca Lisboa, Bilbao, Barcelona…"/><kbd>↵</kbd></form>
      <div className="header-actions"><button className="icon-btn" onClick={onNotice}><Bell/><i/></button><button className="member-stack" onClick={()=>setParticipantsOpen(true)} aria-label={`Ver los ${members.length} participantes`}>{members.slice(0,3).map(member=><Avatar src={member.avatar_url} name={member.display_name} key={member.id}/>)}{members.length>3&&<span>+{members.length-3}</span>}</button></div>
    </header>
    {participantsOpen&&<ParticipantsModal members={members} onClose={()=>setParticipantsOpen(false)}/>} 
    <div className="map-canvas">
      <div ref={mapNode} className="real-map" aria-label="Mapa interactivo de pegatinas"/>
      <div className="map-copy"><p>El mapa de vuestra historia</p><h1>{stats.activated} {stats.activated===1?'lugar':'lugares'}.<br/><span>{stats.activated?'Recuerdos reales.':'La aventura empieza aquí.'}</span></h1><div><span className="live-dot"/> {stats.discovered} descubiertas <i/> {stats.hidden} esperando</div></div>
      <button className="layers" onClick={()=>map.current?.fitBounds([[-10.2,36],[3.4,44]],{padding:70,duration:1000})}><Globe2/>Ver todos</button>
      <div className="privacy-toast"><span><LockKeyhole/></span><div><b>{stats.hidden} cromos siguen ocultos</b><small>Solo sus creadores conocen el lugar.</small></div></div>
    </div>
  </section>
}
function ParticipantsModal({members,onClose}:{members:Member[];onClose:()=>void}){
  useEffect(()=>{const close=(event:KeyboardEvent)=>event.key==='Escape'&&onClose();window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[onClose])
  const admins=members.filter(member=>member.role==='admin')
  const participants=members.filter(member=>member.role!=='admin')
  return <div className="participants-backdrop" onMouseDown={event=>event.target===event.currentTarget&&onClose()}><section className="participants-panel" role="dialog" aria-modal="true" aria-labelledby="participants-title"><header><div><span className="eyebrow">VUESTRA AVENTURA</span><h2 id="participants-title">Participantes</h2><p>{members.length} {members.length===1?'persona forma':'personas forman'} parte del grupo</p></div><button className="close" onClick={onClose} aria-label="Cerrar"><X/></button></header><div className="participants-list">{[...admins,...participants].map(member=><article key={member.id}><Avatar src={member.avatar_url} name={member.display_name}/><div><b>{member.display_name}</b><small>{member.username?`@${member.username}`:'Sin alias'}</small></div><span className={member.role==='admin'?'admin':''}>{member.role==='admin'?'Administrador':'Participante'}</span></article>)}</div></section></div>
}
function CollectibleCard({pin,locked=false,reveal=false}:{pin:Pin;locked?:boolean;reveal?:boolean}) {
  return <article className={'collectible-card '+(locked?'is-locked ':'')+(reveal?'card-reveal':'')} style={{'--card-color':pin.color} as React.CSSProperties}>
    <div className="foil"/><div className="card-number">LOS VATOS · #{String(pin.number).padStart(3,'0')}</div>
    <div className="card-photo">{!locked?(pin.photo?<img src={pin.photo} alt={`Recuerdo de ${pin.city}`}/>:<div className="photo-empty"><Camera/><span>Sin fotografía</span></div>):pin.hintUnlocked&&pin.photo?<><img src={pin.photo} alt={`Pista para encontrar el cromo de ${pin.city}`}/><span className="hint-ribbon">Pista desbloqueada</span></>:<div className="locked-art"><LockKeyhole/><span>Sin descubrir</span></div>}<span className="card-place">{pin.title||pin.city}</span></div>
    <div className="card-info"><div><span>{pin.country}</span><h3>{locked?'Cromo secreto':pin.city}</h3></div><Sparkles/>{!locked&&<p>“{pin.message}”</p>}</div>
  </article>
}

async function editStickerLocation(pin:Pin){const city=window.prompt('Nombre del lugar',pin.city==='Lugar sin nombre'?'':pin.city);if(city===null)return;const country=window.prompt('País (opcional)',pin.country||'');if(country===null)return;try{const token=await neonAuth.getJWTToken();const response=await fetch(`/api/stickers/${pin.id}/location`,{method:'PATCH',headers:{'content-type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({city,country})});await readApiResponse(response);window.location.reload()}catch(reason){window.alert(reason instanceof Error?reason.message:'No se pudo actualizar el lugar')}}
function StickerPanel({pin,owned,onClose}:{pin:Pin;owned:boolean;onClose:()=>void}) {
  return <div className="detail-panel card-panel"><button className="close" onClick={onClose}><X/></button><div className="panel-card-wrap"><CollectibleCard pin={pin} locked={!owned}/></div><div className="panel-body"><span className="eyebrow">CROMO</span><h2>{pin.city}</h2><p className="location"><MapPin/> {pin.city}{pin.country?`, ${pin.country}`:''}</p>{pin.owned&&<button className="edit-location-button" onClick={()=>editStickerLocation(pin)}><MapPin/> Editar nombre del lugar</button>}{!owned?<div className="public-card-info"><div className="privacy-note"><LockKeyhole/><div><b>Contenido privado</b><small>Foto, mensaje e historia se revelan al descubrirlo.</small></div></div><div className="author"><Avatar src={pin.authorAvatar} name={pin.author}/><div><small>Activado por</small><b>{pin.author}</b><span>{pin.date}</span></div></div><div className="discover-head"><b>Lo han encontrado</b><span>{pin.count} personas</span></div><DiscoveryList discoveries={pin.discoveries}/></div>:<><p className="story">“{pin.story||'Sin historia'}”</p>{pin.message&&<div className="creator-message"><Avatar src={pin.authorAvatar} name={pin.author}/><div><small>Un mensaje de {pin.author}</small><p>{pin.message}</p></div></div>}<div className="author"><Avatar src={pin.authorAvatar} name={pin.author}/><div><small>Activado por</small><b>{pin.author} · {pin.date}</b></div></div><div className="discover-head"><b>Coleccionistas</b><span>{pin.count}</span></div><DiscoveryList discoveries={pin.discoveries}/></>}</div></div>
}
function DiscoveryList({discoveries}:{discoveries:Discovery[]}){return <div className="people">{discoveries.length?discoveries.map((item,i)=><div key={item.id}><Avatar src={item.avatar} name={item.name}/><span><b>{item.name}</b><small>{formatDate(item.at)}</small></span>{i===0&&<Trophy/>}</div>):<div className="empty-inline">Todavía no lo ha encontrado nadie.</div>}</div>}
function getPreciseLocation(){return new Promise<GeolocationPosition>((resolve,reject)=>{if(!navigator.geolocation)return reject(new Error('Tu dispositivo no permite geolocalización.'));let best:GeolocationPosition|undefined;let settled=false;const finish=(position?:GeolocationPosition,error?:GeolocationPositionError)=>{if(settled)return;settled=true;navigator.geolocation.clearWatch(watchId);clearTimeout(timer);if(position)resolve(position);else if(error?.code===1)reject(new Error('El permiso de ubicación está desactivado. Permítelo en los ajustes del navegador y activa la ubicación precisa.'));else reject(new Error('No hemos podido obtener tu ubicación. Activa el GPS y vuelve a intentarlo al aire libre.'))};const watchId=navigator.geolocation.watchPosition(position=>{if(!best||position.coords.accuracy<best.coords.accuracy)best=position;if(position.coords.accuracy<=50)finish(position)},error=>{if(error.code===1)finish(undefined,error)},{enableHighAccuracy:true,timeout:18000,maximumAge:0});const timer=window.setTimeout(()=>finish(best),12000)})}
function ScanFlow({onClose}:{onClose:()=>void;onCollect:(id:string)=>void}) {
  const [mode,setMode]=useState<'choose'|'activate'|'working'|'success'|'error'>('choose');const [title,setTitle]=useState('');const [city,setCity]=useState('');const [country,setCountry]=useState('');const [story,setStory]=useState('');const [message,setMessage]=useState('');const [photo,setPhoto]=useState('');const [error,setError]=useState('');const [result,setResult]=useState<any>(null);const [detectingPlace,setDetectingPlace]=useState(false);const [placeError,setPlaceError]=useState('')
  const call=async(endpoint:string,payload:Record<string,unknown>)=>{setMode('working');setError('');try{const position=await getPreciseLocation();const token=await neonAuth.getJWTToken();const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({...payload,latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy})});const data=await readApiResponse(response);setResult(data);setMode('success')}catch(reason){setError(reason instanceof Error?reason.message:'Ha ocurrido un error');setMode('error')}}
  const detectPlace=async()=>{setDetectingPlace(true);setPlaceError('');try{const position=await getPreciseLocation();const token=await neonAuth.getJWTToken();const response=await fetch('/api/location/reverse',{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy})});const place=await readApiResponse(response);setCity(place.city||'');setCountry(place.country||'')}catch(reason){setPlaceError(reason instanceof Error?reason.message:'No se pudo detectar el lugar')}finally{setDetectingPlace(false)}}
  const beginActivation=()=>{setMode('activate');void detectPlace()}
  return <div className="modal-backdrop"><div className="scan-modal"><button className="close" onClick={onClose}><X/></button>{mode==='choose'&&<><div className="scan-symbol"><ScanLine/></div><span className="eyebrow">ESCANEAR QR</span><h2>¿Qué quieres registrar?</h2><p>Validaremos tu posición real antes de guardar cualquier cambio.</p><div className="choice-grid"><button onClick={beginActivation}><span className="choice-icon coral"><Plus/></span><b>He colocado<br/>un cromo</b><small>Crea un punto secreto</small><ChevronRight/></button><button onClick={()=>call('/api/stickers/discover',{})}><span className="choice-icon green"><Crosshair/></span><b>He encontrado<br/>un cromo</b><small>Añádelo a tu colección</small><ChevronRight/></button></div><div className="privacy-line"><ShieldCheck/> La proximidad se calcula de forma segura en Neon.</div></>}{mode==='activate'&&<><div className="scan-symbol coral-bg"><Camera/></div><span className="eyebrow">NUEVO CROMO</span><h2>Deja una sorpresa</h2><div className="photo-actions"><label><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={async e=>{const file=e.target.files?.[0];if(file)setPhoto(await prepareAvatar(file))}}/><Camera/><b>Hacer foto</b></label><label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={async e=>{const file=e.target.files?.[0];if(file)setPhoto(await prepareAvatar(file))}}/><Sparkles/><b>Elegir de la galería</b></label></div>{photo&&<div className="photo-ready"><Check/> Foto preparada</div>}{detectingPlace?<div className="place-detection working"><Crosshair/> Detectando ciudad y país…</div>:city?<div className="place-detection success"><Check/> Detectado: {city}{country?`, ${country}`:''}</div>:<button className="place-detection retry" onClick={detectPlace}><LocateFixed/> Detectar mi ciudad y país</button>}{placeError&&<p className="place-detection-error">{placeError}</p>}<div className="location-fields"><label className="field">Nombre del lugar <small>Se detectará automáticamente si lo dejas vacío</small><input value={city} maxLength={80} onChange={e=>setCity(e.target.value)} placeholder="Automático según tu GPS"/></label><label className="field">País <small>Opcional</small><input value={country} maxLength={80} onChange={e=>setCountry(e.target.value)} placeholder="Automático"/></label></div><label className="field sticker-title-field">Título del cromo <small>Aparecerá escrito sobre la fotografía</small><input value={title} minLength={2} maxLength={100} required onChange={e=>setTitle(e.target.value)} placeholder="Ej. Donde empezó todo"/></label><label className="field">Mensaje<textarea value={message} maxLength={1000} onChange={e=>setMessage(e.target.value)} placeholder="Mensaje para quien lo encuentre"/></label><label className="field">Historia opcional<textarea value={story} maxLength={3000} onChange={e=>setStory(e.target.value)}/></label><button className="primary full" disabled={title.trim().length<2} onClick={()=>call('/api/stickers/activate',{title,story,message,photo,city,country})}><MapPin/> Obtener ubicación y activar</button><button className="text-btn" onClick={()=>setMode('choose')}>Volver</button></>}{mode==='working'&&<div className="locating"><div className="radar"><i/><i/><span><Crosshair/></span></div><h2>Comprobando tu ubicación…</h2><p>Espera junto al cromo físico.</p></div>}{mode==='error'&&<div className="scan-error"><div className="scan-symbol coral-bg"><X/></div><h2>No se ha podido completar</h2><p>{error}</p><button className="primary full" onClick={()=>setMode('choose')}>Volver a intentarlo</button></div>}{mode==='success'&&<div className="success-state"><div className="success-check"><Check/></div><h2>{result?.card?'¡Cromo descubierto!':'¡Cromo activado!'}</h2><p>{result?.card?`Ya forma parte de tu colección${result.distance!=null?` · a ${result.distance} m`:''}.`:'Se ha guardado en Neon y su ubicación permanece oculta.'}</p>{result?.card&&<div className="success-card"><Sparkles/><div><b>{result.card.title||result.card.city||'Nuevo cromo'}</b><small>{result.card.message||'Contenido desbloqueado'}</small></div></div>}<button className="primary full" onClick={()=>window.location.reload()}>Ver en la aplicación</button></div>}</div></div>
}
function CollectionPage({collected}:{collected:string[]}){
  const {pins}=useLiveData();const [openCard,setOpenCard]=useState<Pin|null>(null);const [query,setQuery]=useState('');const filteredPins=pins.filter(pin=>(pin.city+' '+pin.country).toLowerCase().includes(query.trim().toLowerCase()));const owned=openCard?collected.includes(openCard.id):false;const percent=pins.length?Math.round(collected.length/pins.length*100):0
  return <section className="content-page collection-page"><PageHeader eyebrow="TU ÁLBUM DE VIAJE" title={`${collected.length} de ${pins.length} cromos`} desc="Consulta todos los cromos activados por ciudad. La foto-pista se abre al entrar en ella."/><label className="collection-search"><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar por ciudad o país…"/></label>{!pins.length?<EmptyState icon={<Sparkles/>} title="Tu colección está vacía" text="Cuando descubras vuestro primer cromo aparecerá aquí."/>:<><div className="collection-progress"><span style={{width:`${percent}%`}}/><b>{percent}% completado</b></div><div className="card-grid">{filteredPins.map(pin=><div className="album-slot" key={pin.id}><button className="album-card-button" onClick={()=>setOpenCard(pin)}><CollectibleCard pin={pin} locked={!collected.includes(pin.id)}/></button><small>{collected.includes(pin.id)?`Descubierto · ${pin.city}`:pin.hintUnlocked?'Foto-pista desbloqueada':`Bloqueado · ${pin.city}`}</small></div>)}</div></>}{openCard&&<div className="card-modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setOpenCard(null)}><div className="card-modal"><button className="close" onClick={()=>setOpenCard(null)}><X/></button><div className="card-modal-visual"><CollectibleCard pin={openCard} locked={!owned}/></div><div className="card-modal-info"><span className="eyebrow">CROMO</span><h2>{owned?openCard.city:'Cromo secreto'}</h2><p className="location"><MapPin/> {openCard.city}, {openCard.country}</p>{owned?<><div className="modal-author"><Avatar src={openCard.authorAvatar} name={openCard.author}/><div><small>Creado por</small><b>{openCard.author}</b><span>{openCard.date}</span></div></div><div className="info-section"><small>LA HISTORIA</small><p>{openCard.story||'Sin historia'}</p></div>{openCard.message&&<div className="info-section message-section"><small>MENSAJE PARA TI</small><p>“{openCard.message}”</p></div>}<DiscoveryList discoveries={openCard.discoveries}/></>:<div className="locked-modal-copy"><LockKeyhole/><h3>El lugar es público. El recuerdo no.</h3><p>Descubre físicamente este cromo para revelar su contenido.</p></div>}</div></div></div>}</section>
}
function PageHeader({eyebrow,title,desc}:{eyebrow:string,title:string,desc:string}){return <header className="page-title"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{desc}</p></header>}

function EmptyState({icon,title,text}:{icon:React.ReactNode;title:string;text:string}){return <div className="empty-state"><span>{icon}</span><h3>{title}</h3><p>{text}</p></div>}
function ActivityPage(){const {activities}=useLiveData();return <section className="content-page"><PageHeader eyebrow="VUESTRO DIARIO" title="Actividad del grupo" desc="Solo eventos guardados en vuestra base de datos."/>{!activities.length?<EmptyState icon={<Activity/>} title="Todavía no hay actividad" text="La primera activación o descubrimiento aparecerá aquí."/>:<div className="feed">{activities.map(item=><article className="feed-item" key={item.id}><div className="feed-icon green"><Activity/></div><div className="feed-content"><time>{formatDateTime(item.created_at)}</time><h3><b>{item.actor}</b> · {activityLabel(item.activity_type)}</h3>{item.city&&<p>{item.city}</p>}</div></article>)}</div>}</section>}
function StatsPage(){const {stats,members}=useLiveData();return <section className="content-page"><PageHeader eyebrow="DATOS REALES" title={`${stats.activated} lugares, ${stats.discoveries} hallazgos`} desc="Estadísticas calculadas directamente desde Neon."/><div className="stat-grid"><Stat icon={<MapPin/>} value={String(stats.activated)} label="cromos activados"/><Stat icon={<Sparkles/>} value={String(stats.discovered)} label="cromos descubiertos"/><Stat icon={<Route/>} value={String(stats.discoveries)} label="descubrimientos"/><Stat icon={<Users/>} value={String(members.length)} label="miembros reales"/></div>{!stats.activated&&<EmptyState icon={<BarChart3/>} title="Aún no hay estadísticas" text="Los datos aparecerán cuando el grupo empiece a activar cromos."/>}</section>}
function Stat({icon,value,label}:{icon:React.ReactNode;value:string;label:string}){return <div className="stat"><span>{icon}</span><b>{value}</b><p>{label}</p></div>}
async function prepareAvatar(file:File){return new Promise<string>((resolve,reject)=>{if(!file.type.startsWith('image/'))return reject(new Error('Selecciona una imagen válida'));const image=new Image();const url=URL.createObjectURL(file);image.onload=()=>{const size=512;const scale=Math.min(1,size/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d')?.drawImage(image,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);resolve(canvas.toDataURL('image/webp',.82))};image.onerror=()=>reject(new Error('No se pudo leer la imagen'));image.src=url})}
function ProfilePage(){const {profile,pins}=useLiveData();const [editing,setEditing]=useState(false);if(!profile)return <section className="content-page"><EmptyState icon={<UserRound/>} title="Preparando tu perfil" text="Actualiza la página en unos segundos."/></section>;const placed=pins.filter(p=>p.owned).length;const found=pins.filter(p=>p.collected).length;const first=pins.filter(p=>p.discoveries[0]?.id===profile.id).length;const countries=new Set(pins.filter(p=>p.collected||p.owned).map(p=>p.country).filter(Boolean)).size;return <section className="content-page profile-page"><div className="profile-hero"><div className="profile-avatar"><Avatar src={profile.avatar_url} name={profile.display_name}/><span><Camera/></span></div><div><span className="eyebrow">MIEMBRO DESDE {new Date(profile.created_at).getFullYear()}</span><h1>{profile.display_name}</h1><p>{profile.username?`@${profile.username}`:'Sin alias todavía'}</p></div><button className="outline" onClick={()=>setEditing(true)}>Editar perfil</button></div><div className="profile-stats"><div><b>{placed}</b><span>Colocados</span></div><div><b>{found}</b><span>Encontrados</span></div><div><b>{first}</b><span>Primeros hallazgos</span></div><div><b>{countries}</b><span>Países</span></div></div><section className="profile-account-actions"><div><span className="eyebrow">CUENTA</span><h2>Sesión y acceso</h2><p>Cierra tu sesión en este dispositivo. Podrás volver a entrar desde la portada privada.</p></div><button className="profile-logout" onClick={()=>authClient.signOut()}><LogOut/> Cerrar sesión</button></section>{!placed&&!found&&<EmptyState icon={<Compass/>} title="Tu aventura empieza ahora" text="Todavía no has colocado ni encontrado ningún cromo."/>}{editing&&<EditProfileModal profile={profile} onClose={()=>setEditing(false)}/>}</section>}
function EditProfileModal({profile,onClose}:{profile:Profile;onClose:()=>void}){const [name,setName]=useState(profile.display_name);const [username,setUsername]=useState(profile.username||'');const [avatar,setAvatar]=useState(profile.avatar_url||'');const [error,setError]=useState('');const [saving,setSaving]=useState(false);const submit=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);setError('');try{const token=await neonAuth.getJWTToken();const response=await fetch('/api/profile',{method:'PATCH',headers:{'content-type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({displayName:name,username,avatarUrl:avatar||null})});await readApiResponse(response);window.location.reload()}catch(reason){setError(reason instanceof Error?reason.message:'No se pudo guardar')}finally{setSaving(false)}};return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><form className="edit-profile-modal" onSubmit={submit}><button type="button" className="close" onClick={onClose}><X/></button><span className="eyebrow">TU IDENTIDAD</span><h2>Editar perfil</h2><label className="edit-avatar"><Avatar src={avatar} name={name}/><span><Camera/> Cambiar fotografía<input type="file" accept="image/jpeg,image/png,image/webp" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;try{setAvatar(await prepareAvatar(file))}catch(reason){setError(reason instanceof Error?reason.message:'Imagen inválida')}}}/></span></label><label className="field">Nombre visible<input value={name} maxLength={80} onChange={e=>setName(e.target.value)} required/></label><label className="field">Alias<input value={username} maxLength={30} placeholder="tu_alias" onChange={e=>setUsername(e.target.value.toLowerCase())}/></label>{error&&<p className="form-error">{error}</p>}<button className="primary full" disabled={saving}>{saving?'Guardando…':'Guardar cambios'}<Check/></button></form></div>}
function NotificationPanel({notifications,onClose}:{notifications:NotificationRow[];onClose:()=>void}){return <div className="notifications"><div className="notif-head"><h3>Notificaciones</h3><button onClick={onClose}><X/></button></div>{notifications.length?<div className="notification-list">{notifications.map(item=><article key={item.id}><span><MapPin/></span><div><b>{item.title}</b><p>{item.body}</p><small>{formatDateTime(item.created_at)}</small></div></article>)}</div>:<EmptyState icon={<Bell/>} title="Sin notificaciones" text="Aquí aparecerán únicamente avisos reales del grupo."/>}</div>}
function CityHintModal({hints,onClose}:{hints:any[];onClose:()=>void}){const [index,setIndex]=useState(0);const hint=hints[index];return <div className="card-modal-backdrop city-hint-backdrop"><section className="city-hint-modal"><button className="close" onClick={onClose}><X/></button><span className="eyebrow">PISTA DESBLOQUEADA</span><h2>¡Hay un cromo en {hint.city}!</h2><p>Has entrado en la ciudad. Esta foto es tu pista para encontrar la pegatina física.</p>{hint.photo_url?<img src={hint.photo_url} alt={`Pista del cromo ${hint.sticker_number}`}/>:<div className="photo-empty"><Camera/><span>Este cromo no tiene fotografía</span></div>}<div className="city-hint-footer"><span>LOS VATOS · #{String(hint.sticker_number).padStart(3,'0')}</span><small>{index+1} de {hints.length}</small></div>{index<hints.length-1?<button className="primary full" onClick={()=>setIndex(index+1)}>Ver siguiente pista <ChevronRight/></button>:<button className="primary full" onClick={onClose}>Entendido <Check/></button>}<small className="hint-privacy"><LockKeyhole/> La ubicación exacta, el mensaje y la historia siguen bloqueados.</small></section></div>}
export default App
