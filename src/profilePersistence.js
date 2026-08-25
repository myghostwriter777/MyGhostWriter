const normalizedEmail=email=>String(email||"").trim().toLowerCase();
const browserStorage=()=>typeof window!=="undefined"?window.localStorage:null;

export const profileStorageKey=email=>`gwm2_profile_${normalizedEmail(email)}`;

export const loadSavedProfile=(email,storage=browserStorage())=>{
  if(!normalizedEmail(email)||!storage)return null;
  try{
    const value=JSON.parse(storage.getItem(profileStorageKey(email))||"null");
    if(!value||typeof value!=="object")return null;
    return {
      ...(typeof value.name==="string"&&value.name.trim()?{name:value.name.trim()}:{}),
      ...(typeof value.avatar==="string"&&value.avatar?{avatar:value.avatar}:value.avatar===null?{avatar:null}:{}),
    };
  }catch{return null;}
};

export const saveProfile=(user,storage=browserStorage())=>{
  if(!normalizedEmail(user?.email)||!storage)return null;
  const profile={name:String(user?.name||"User").trim()||"User",avatar:typeof user?.avatar==="string"&&user.avatar?user.avatar:null};
  try{storage.setItem(profileStorageKey(user.email),JSON.stringify(profile));}catch{}
  return profile;
};

export const mergeSavedProfile=(user,storage=browserStorage())=>({...user,...(loadSavedProfile(user?.email,storage)||{})});
