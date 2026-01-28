import { supabase } from './client'

export async function uploadChatImage(
  userId: string,
  imageData: string,
  messageId: string
): Promise<{ url: string; path: string } | null> {
  try {
    const base64Data = imageData.split(',')[1]
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'image/jpeg' })

    const fileName = `${userId}/${messageId}-${Date.now()}.jpg`
    
    const { data, error } = await supabase.storage
      .from('chat-images')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (error) {
      console.error('Erro ao fazer upload da imagem:', error)
      return null
    }

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

export async function uploadProfilePhoto(
  userId: string,
  imageData: string
): Promise<string | null> {
  try {
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
