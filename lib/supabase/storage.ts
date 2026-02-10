import { getSupabaseClient } from './client'

export async function uploadChatImage(
  userId: string,
  imageData: string,
  messageId: string
): Promise<{ url: string; path: string } | null> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return null
    }
    const parts = imageData.split(',')
    if (parts.length < 2) {
      console.error('❌ [Storage] Formato de imagem inválido (não é DataURL)')
      return null
    }
    const base64Data = parts[1]
    const contentType = parts[0].split(':')[1].split(';')[0]

    console.log(`📡 [Storage] Carregando ${contentType} para bucket chat-images...`)

    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: contentType })

    const fileName = `${userId}/${messageId}-${Date.now()}.jpg`

    const { data, error } = await supabase.storage
      .from('chat-images')
      .upload(fileName, blob, {
        contentType: contentType,
        upsert: false,
      })

    if (error) {
      console.error('❌ [Storage] Erro no upload:', error.message)
      return null
    }

    console.log('✅ [Storage] Upload concluído:', fileName)

    const { data: { publicUrl } } = supabase.storage
      .from('chat-images')
      .getPublicUrl(fileName)

    return {
      url: publicUrl,
      path: fileName,
    }
  } catch (error) {
    console.error('Erro ao processar imagem:', error)
    return null
  }
}

export async function uploadChatVideo(
  userId: string,
  videoData: string,
  messageId: string
): Promise<{ url: string; path: string } | null> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) return null

    const parts = videoData.split(',')
    if (parts.length < 2) return null
    const base64Data = parts[1]
    const contentType = parts[0].split(':')[1].split(';')[0]

    console.log(`📡 [Storage] Carregando vídeo ${contentType}...`)

    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: contentType })

    const fileName = `${userId}/${messageId}-${Date.now()}.mp4`

    const { data, error } = await supabase.storage
      .from('chat-images')
      .upload(fileName, blob, {
        contentType: contentType,
        upsert: false,
      })

    if (error) {
      console.error('❌ [Storage] Erro no upload de vídeo:', error.message)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('chat-images')
      .getPublicUrl(fileName)

    return { url: publicUrl, path: fileName }
  } catch (error) {
    console.error('Erro ao processar vídeo:', error)
    return null
  }
}

export async function uploadChatAudio(
  userId: string,
  audioData: string,
  messageId: string
): Promise<{ url: string; path: string } | null> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) return null

    const parts = audioData.split(',')
    if (parts.length < 2) return null
    const base64Data = parts[1]
    const contentType = parts[0].split(':')[1].split(';')[0]

    console.log(`📡 [Storage] Carregando áudio ${contentType}...`)

    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: contentType })

    const fileName = `${userId}/audio-${messageId}-${Date.now()}.webm`

    const { data, error } = await supabase.storage
      .from('chat-images')
      .upload(fileName, blob, {
        contentType: contentType,
        upsert: false,
      })

    if (error) {
      console.error('❌ [Storage] Erro no upload de áudio:', error.message)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('chat-images')
      .getPublicUrl(fileName)

    return { url: publicUrl, path: fileName }
  } catch (error) {
    console.error('Erro ao processar áudio:', error)
    return null
  }
}

export async function uploadProfilePhoto(
  userId: string,
  imageData: string
): Promise<string | null> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return null
    }
    const base64Data = imageData.split(',')[1]
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'image/jpeg' })

    const fileName = `${userId}/profile-${Date.now()}.jpg`

    const { data, error } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (error) {
      console.error('Erro ao fazer upload da foto de perfil:', error)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(fileName)

    return publicUrl
  } catch (error) {
    console.error('Erro ao processar foto de perfil:', error)
    return null
  }
}

export async function uploadCoverPhoto(
  userId: string,
  imageData: string
): Promise<string | null> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return null
    }
    const base64Data = imageData.split(',')[1]
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'image/jpeg' })

    const fileName = `${userId}/cover-${Date.now()}.jpg`

    const { data, error } = await supabase.storage
      .from('cover-photos')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (error) {
      console.error('Erro ao fazer upload da foto de capa:', error)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('cover-photos')
      .getPublicUrl(fileName)

    return publicUrl
  } catch (error) {
    console.error('Erro ao processar foto de capa:', error)
    return null
  }
}

export async function deleteChatImage(path: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return false
    }
    const { error } = await supabase.storage
      .from('chat-images')
      .remove([path])

    if (error) {
      console.error('Erro ao deletar imagem:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro ao deletar imagem:', error)
    return false
  }
}
