import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// URL et Clé de l'API Hugging Face
const HF_API_URL = 'https://api-inference.huggingface.co/models/emilyalsentzer/Bio_ClinicalBERT';
const HF_API_KEY = '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'; // ⚠️ À sécuriser

// Réponses rapides pour symptômes courants
const QUICK_RESPONSES = {
  "mal de tête": "Vous avez des maux de tête ?\n1. Prenez du paracétamol\n2. Reposez-vous dans un endroit calme\n3. Hydratez-vous bien\n→ Consultez si persiste plus de 48h ou si très intense.",
  "fièvre": "Vous avez de la fièvre ?\n1. Prenez votre température\n2. Si >38.5°C: prenez un antipyrétique\n3. Hydratez-vous abondamment\n→ Consultez si fièvre >3 jours ou >40°C.",
  "toux": "Vous avez une toux ?\n1. Buvez des boissons chaudes\n2. Utilisez des pastilles pour la gorge\n3. Évitez les irritants (tabac, pollution)\n→ Consultez si persiste >1 semaine ou sang dans les crachats.",
  "nausée": "Vous ressentez des nausées ?\n1. Reposez-vous\n2. Mangez léger (biscottes, riz)\n3. Buvez par petites gorgées\n→ Consultez si vomissements fréquents ou signes de déshydratation.",
  "douleur musculaire": "Vous avez des douleurs musculaires ?\n1. Appliquez du chaud ou du froid\n2. Faites des étirements doux\n3. Massez légèrement\n→ Consultez si douleur intense ou persiste >5 jours.",
  "mal de gorge": "Vous avez mal à la gorge ?\n1. Gargarismes d'eau salée\n2. Pastilles pour la gorge\n3. Buvez des liquides chauds\n→ Consultez si difficulté à avaler ou fièvre associée.",
  "rhume": "Vous avez un rhume ?\n1. Reposez-vous\n2. Lavez votre nez avec du sérum physiologique\n3. Buvez beaucoup\n→ Consultez si symptômes >10 jours ou fièvre élevée.",
  "diarrhée": "Vous avez de la diarrhée ?\n1. Hydratez-vous bien (eau, bouillons)\n2. Mangez léger (riz, carottes)\n3. Évitez laitages et fibres\n→ Consultez si sang dans selles ou signes de déshydratation.",
  "constipation": "Vous avez des difficultés à aller à la selle ?\n1. Buvez beaucoup d'eau\n2. Mangez des fibres (fruits, légumes)\n3. Marchez régulièrement\n→ Consultez si persiste >1 semaine ou douleurs abdominales.",
  "fatigue": "Vous êtes fatigué ?\n1. Dormez suffisamment\n2. Hydratez-vous\n3. Faites une activité physique légère\n→ Consultez si fatigue persistante >1 mois."
};

export default function ChatScreen() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef();

  useEffect(() => {
    setMessages([{
      text: "👋 Bonjour ! Je suis MediBot. Décrivez vos symptômes, et je vais vous aider.",
      sender: "MediBot",
      isBot: true,
      time: getCurrentTime()
    }]);
  }, []);

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSymptomDetection = (input) => {
    for (let symptom in QUICK_RESPONSES) {
      if (input.toLowerCase().includes(symptom)) {
        return QUICK_RESPONSES[symptom];
      }
    }
    return null;
  };

  const queryHFAPI = async (input) => {
    try {
      const prompt = `Patient: ${input}\nMédecin:`;

      const response = await fetch(HF_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 100,
            temperature: 0.7,
            repetition_penalty: 1.2
          }
        })
      });

      if (!response.ok) {
        if (response.status === 503) {
          const data = await response.json();
          return `⏳ Le modèle charge (attente ${Math.ceil(data.estimated_time)}s)...`;
        }
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json();
      const generatedText = data[0]?.generated_text || "";
      const reply = generatedText.split('Médecin:')[1]?.trim();

      return reply || "❗ Je n'ai pas pu comprendre votre demande.";
    } catch (error) {
      console.error("Erreur API:", error);
      return "🚫 Service temporairement indisponible.";
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMsg = {
      text: message,
      sender: "Vous",
      isBot: false,
      time: getCurrentTime()
    };

    setMessages(prev => [...prev, userMsg]);
    setMessage('');
    setLoading(true);
    setIsTyping(true);

    try {
      flatListRef.current?.scrollToEnd({ animated: true });

      const quickResponse = handleSymptomDetection(userMsg.text);
      if (quickResponse) {
        setMessages(prev => [
          ...prev,
          {
            text: quickResponse,
            sender: "MediBot",
            isBot: true,
            time: getCurrentTime()
          }
        ]);
        setIsTyping(false);
        setLoading(false);
        return;
      }

      setTimeout(async () => {
        const botResponse = await queryHFAPI(userMsg.text);

        setMessages(prev => [
          ...prev,
          {
            text: botResponse,
            sender: "MediBot",
            isBot: true,
            time: getCurrentTime()
          }
        ]);

        setIsTyping(false);
        setLoading(false);
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 1500);
    } catch {
      setIsTyping(false);
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={[
      styles.messageWrapper,
      item.isBot ? styles.botWrapper : styles.userWrapper
    ]}>
      <View style={[
        styles.messageContainer,
        item.isBot ? styles.botMessage : styles.userMessage
      ]}>
        <Text style={styles.senderText}>{item.sender}</Text>
        <Text style={styles.messageText}>{item.text}</Text>
        <Text style={styles.timeText}>{item.time}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      {/* Navbar Placeholder */}
      <View style={styles.navbar}>
        <Text style={styles.navbarTitle}>🩺 MediBot</Text>
      </View>

      {/* Chat Area */}
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(_, index) => index.toString()}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {isTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>✏️ MediBot est en train d'écrire...</Text>
          </View>
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.inputContainer}
        >
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Décrivez vos symptômes..."
            placeholderTextColor="#a8b4c9"
            multiline
            editable={!loading}
          />

          {loading ? (
            <ActivityIndicator style={styles.loadingIndicator} color="#1f3b73" />
          ) : (
            <TouchableOpacity onPress={sendMessage} disabled={!message.trim()}>
              <Ionicons name="send" size={28} color={message.trim() ? "#1f3b73" : "#ccc"} />
            </TouchableOpacity>
          )}
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
 navbar: {
   height: 80, // Augmente la hauteur si nécessaire
   backgroundColor: '#1f3b73',
   justifyContent: 'center',
   alignItems: 'center',
   paddingTop: Platform.OS === 'ios' ? 30 : 0,
 },

 navbarTitle: {
   color: '#ffffff',
   fontSize: 20,
   fontWeight: 'bold',
   paddingTop: 20, // Ajoute un peu d'espace en haut
 },

  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  messagesContainer: {
    paddingBottom: 10,
    paddingTop: 10,
  },
  messageWrapper: {
    marginBottom: 10,
    marginHorizontal: 15,
  },
  botWrapper: {
    alignItems: 'flex-start',
  },
  userWrapper: {
    alignItems: 'flex-end',
  },
  messageContainer: {
    padding: 10,
    borderRadius: 10,
    maxWidth: '80%',
  },
  botMessage: {
    backgroundColor: '#e0f7fa',
  },
  userMessage: {
    backgroundColor: '#1f3b73',
  },
  senderText: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#555',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    marginVertical: 5,
  },
  timeText: {
    fontSize: 10,
    color: '#aaa',
    textAlign: 'right',
  },
  typingIndicator: {
    paddingHorizontal: 15,
    paddingBottom: 5,
  },
  typingText: {
    fontStyle: 'italic',
    fontSize: 14,
    color: '#1f3b73',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f4f7fa',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  input: {
    flex: 1,
    padding: 10,
    fontSize: 16,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
  },
  loadingIndicator: {
    marginLeft: 10,
  }
});
