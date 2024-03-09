    let recognition;
    let isSpeechRecognitionOn = false;

    import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";
    const genAI = new GoogleGenerativeAI("AIzaSyDe-HxyBqtzid8KAnfEeQflT6qVucx1_iY");
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const visionModel = genAI.getGenerativeModel({ model: "gemini-pro-vision" });



    async function handleImageInput(imageFile) {
        const chatContainer = document.getElementById('chat-container');




        // Display input container for user to provide a description
        const userInputContainer = document.createElement('div');
        userInputContainer.className = 'message-container';
        const userInputMessage = document.createElement('div');
        userInputMessage.className = 'message user-message';
        userInputMessage.innerHTML = '<div id="user-input-container"><input type="text" id="user-input" placeholder="Enter description..."><button onclick="submitUserInput()">Submit</button></div>';
        userInputContainer.appendChild(userInputMessage);
        chatContainer.appendChild(userInputContainer);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // Function to handle user input submission
        window.submitUserInput = async function() {
            const userDescription = document.getElementById('user-input').value;

            // Remove the input container
            userInputContainer.remove();

            // Display user message with resized image and user-provided description
            const userMessageContainer = document.createElement('div');
            userMessageContainer.className = 'message-container';
            const userMessage = document.createElement('div');
            userMessage.className = 'message user-message';

            // Resize the image to 700x400
            const resizedImage = await resizeImage(imageFile, 700, 400);
            userMessage.innerHTML = `<div>${userDescription}</div><img src="${URL.createObjectURL(resizedImage)}" alt="User Image" />`;

            userMessageContainer.appendChild(userMessage);
            chatContainer.appendChild(userMessageContainer);
            chatContainer.scrollTop = chatContainer.scrollHeight;

            // Convert original image file to GenerativeAI.Part object
            const originalImagePart = await fileToGenerativePart(imageFile);

            // Generate text from original image using the vision model and user description
            const originalResult = await visionModel.generateContent([userDescription, originalImagePart]);
            const originalResponse = await originalResult.response;
            const originalGeneratedText = originalResponse.text();

            // Display bot reply with generated text for the original image
            const botReplyContainerOriginal = document.createElement('div');
            botReplyContainerOriginal.className = 'message-container';
            const botReplyOriginal = document.createElement('div');
            botReplyOriginal.className = 'message';
            botReplyOriginal.innerHTML = processText(originalGeneratedText);
            botReplyContainerOriginal.appendChild(botReplyOriginal);
            chatContainer.appendChild(botReplyContainerOriginal);
            chatContainer.scrollTop = chatContainer.scrollHeight;

            // Speak the generated text if speech is enabled
            speakText(originalGeneratedText);

            // Start speech recognition
            startSpeechRecognition();
        };
    }


    // Function to resize an image
    async function resizeImage(file, maxWidth, maxHeight) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Calculate new dimensions while maintaining the aspect ratio
                    let newWidth = img.width;
                    let newHeight = img.height;

                    if (img.width > maxWidth) {
                        newWidth = maxWidth;
                        newHeight = (img.height * maxWidth) / img.width;
                    }

                    if (newHeight > maxHeight) {
                        newWidth = (newWidth * maxHeight) / newHeight;
                        newHeight = maxHeight;
                    }

                    // Set canvas dimensions
                    canvas.width = newWidth;
                    canvas.height = newHeight;

                    // Draw resized image on canvas
                    ctx.drawImage(img, 0, 0, newWidth, newHeight);

                    // Convert canvas to Blob
                    canvas.toBlob((blob) => {
                        resolve(new File([blob], file.name, { type: file.type }));
                    }, file.type);
                };

                img.src = event.target.result;
            };

            reader.readAsDataURL(file);
        });
    }


    // Function to convert image file to GenerativeAI.Part object
    async function fileToGenerativePart(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve({
                    inlineData: {
                        data: reader.result.split(",")[1],
                        mimeType: file.type
                    },
                });
            };
            reader.readAsDataURL(file);
        });
    }

    // Event listener for file input change
    document.getElementById('image-input').addEventListener('change', (event) => {
        const fileInput = event.target;
        const files = fileInput.files;

        if (files.length > 0) {
            handleImageInput(files[0]);
            // Reset the file input to allow selecting the same file again
            fileInput.value = '';
        }
    });


    let isSpeechEnabled = false;



    // Add this JavaScript code to handle hover interactions
    const messageContainers = document.querySelectorAll('.message-container');

    messageContainers.forEach((container) => {
        container.addEventListener('mouseenter', () => {
            container.querySelector('.message').classList.add('active');
        });

        container.addEventListener('mouseleave', () => {
            container.querySelector('.message').classList.remove('active');
        });
    });


    function toggleSpeech() {
        isSpeechEnabled = !isSpeechEnabled;
    }

    function speakText(text) {
        if (isSpeechEnabled) {
            const speechSynthesis = window.speechSynthesis;
            const utterance = new SpeechSynthesisUtterance(text);
            speechSynthesis.speak(utterance);
        }
    }

    window.addEventListener('load', function() {
        document.getElementById('speechToggle').addEventListener('change', toggleSpeech);
        startSpeechRecognition();
    });


    function startSpeechRecognition() {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event) => {
            const currentText = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
            document.getElementById('user-input').value = currentText;
            if (!event.results[event.results.length - 1].isFinal) {
                return;
            }
            if (currentText.startsWith('search')) {
                const searchData = currentText.replace('search', '').trim();
                handleSearch(searchData);
            }
        };
        recognition.start();
        isSpeechRecognitionOn = true;
        document.getElementById('mic-button').textContent = '🎤 Off';
    }

    function stopSpeechRecognition() {
        if (recognition) {
            recognition.stop();
            isSpeechRecognitionOn = false;
            document.getElementById('mic-button').textContent = '🎤 On';
        }
    }

    function toggleSpeechRecognition() {
        if (isSpeechRecognitionOn) {
            stopSpeechRecognition();
        } else {
            startSpeechRecognition();
        }
    }

    function handleSearch(searchData) {
        const chatContainer = document.getElementById('chat-container');
        const userMessageContainer = document.createElement('div');
        userMessageContainer.className = 'message-container';
        const userMessage = document.createElement('div');
        userMessage.className = 'message user-message';
        userMessage.innerHTML = processText(searchData);
        userMessageContainer.appendChild(userMessage);
        chatContainer.appendChild(userMessageContainer);
        setTimeout(async() => {
            const botReplyContainer = document.createElement('div');
            botReplyContainer.className = 'message-container';
            const botReply = document.createElement('div');
            botReply.className = 'message typing';
            const generatedText = await getReply(searchData);
            const processedText = processText(generatedText);
            botReply.innerHTML = `<span class="animated-text">${processedText}</span>`;
            botReplyContainer.appendChild(botReply);
            chatContainer.appendChild(botReplyContainer);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            document.getElementById('user-input').value = '';

            const sentences = generatedText.split(/(?<=[.!?])\s+/);
            for (const sentence of sentences) {
                speakText(sentence);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Add a delay between sentences
            }
            startSpeechRecognition();
        }, 500);
    }

    function handleInput(event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
    }

    function handleSpecificResponse(userInput, specificText, replyText) {
        const chatContainer = document.getElementById('chat-container');

        const userMessageContainer = document.createElement('div');
        userMessageContainer.className = 'message-container';
        const userMessage = document.createElement('div');
        userMessage.className = 'message user-message';
        userMessage.innerHTML = processText(userInput);
        userMessageContainer.appendChild(userMessage);
        chatContainer.appendChild(userMessageContainer);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        const botReplyContainer = document.createElement('div');
        botReplyContainer.className = 'message-container';
        const botReply = document.createElement('div');
        botReply.className = 'message';
        botReply.innerHTML = replyText;
        botReplyContainer.appendChild(botReply);
        chatContainer.appendChild(botReplyContainer);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        document.getElementById('user-input').value = specificText;
        startSpeechRecognition();
    }


    function sendMessage() {
        const userInput = document.getElementById('user-input').value.trim().toLowerCase();

        if (userInput.includes("open whatsapp")) {
            const chatContainer = document.getElementById('chat-container');
            const userMessageContainer = document.createElement('div');
            userMessageContainer.className = 'message-container';
            const userMessage = document.createElement('div');
            userMessage.className = 'message user-message';
            userMessage.innerHTML = processText(userInput);
            userMessageContainer.appendChild(userMessage);
            chatContainer.appendChild(userMessageContainer);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            const botReplyContainer = document.createElement('div');
            botReplyContainer.className = 'message-container';
            const botReply = document.createElement('div');
            botReply.className = 'message';
            const whatsappLink = document.createElement('a');
            whatsappLink.href = 'whatsapp://send?text=Hello';
            whatsappLink.textContent = 'Click here to open WhatsApp';
            whatsappLink.target = '_blank';

            botReply.appendChild(whatsappLink);
            botReplyContainer.appendChild(botReply);
            chatContainer.appendChild(botReplyContainer);
            chatContainer.scrollTop = chatContainer.scrollHeight;

            document.getElementById('user-input').value = '';


            startSpeechRecognition();
            return;
        }

        if (userInput.startsWith("search")) {
            // Extract the search query after "search"
            const searchQuery = userInput.replace('search', '').trim();
            document.getElementById('user-input').value = '';

            const chatContainer = document.getElementById('chat-container');

            // Display user message
            const userMessageContainer = document.createElement('div');
            userMessageContainer.className = 'message-container';
            const userMessage = document.createElement('div');
            userMessage.className = 'message user-message';
            userMessage.innerHTML = processText(userInput);
            userMessageContainer.appendChild(userMessage);
            chatContainer.appendChild(userMessageContainer);
            chatContainer.scrollTop = chatContainer.scrollHeight;

            // Display bot reply with Google search link
            const botReplyContainer = document.createElement('div');
            botReplyContainer.className = 'message-container';
            const botReply = document.createElement('div');
            botReply.className = 'message';

            // Create a link to search on Google
            const googleLink = document.createElement('a');
            googleLink.href = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
            googleLink.textContent = `Click here to search for "${searchQuery}" on Google`;
            googleLink.target = '_blank';

            // Add an instruction
            const instruction = document.createElement('p');
            instruction.textContent = 'Please click the link to search on Google.';

            botReply.appendChild(instruction);
            botReply.appendChild(googleLink);
            botReplyContainer.appendChild(botReply);
            chatContainer.appendChild(botReplyContainer);
            chatContainer.scrollTop = chatContainer.scrollHeight;

            // Clear the input
            document.getElementById('user-input').value = '';

            // Start speech recognition
            startSpeechRecognition();
            return;
        }

        if (userInput.startsWith("youtube")) {
            // Extract the search query after "youtube"
            document.getElementById('user-input').value = '';
            const searchQuery = userInput.replace('youtube', '').trim();

            const chatContainer = document.getElementById('chat-container');

            // Display user message
            const userMessageContainer = document.createElement('div');
            userMessageContainer.className = 'message-container';
            const userMessage = document.createElement('div');
            userMessage.className = 'message user-message';
            userMessage.innerHTML = processText(userInput);
            userMessageContainer.appendChild(userMessage);
            chatContainer.appendChild(userMessageContainer);
            chatContainer.scrollTop = chatContainer.scrollHeight;

            // Display bot reply with YouTube link
            const botReplyContainer = document.createElement('div');
            botReplyContainer.className = 'message-container';
            const botReply = document.createElement('div');
            botReply.className = 'message';

            // Create a link to search YouTube
            const youtubeLink = document.createElement('a');
            youtubeLink.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
            youtubeLink.textContent = `Click here to search for "${searchQuery}" on YouTube`;
            youtubeLink.target = '_blank';

            // Add an instruction
            const instruction = document.createElement('p');
            instruction.textContent = 'Please click the link to search (' + searchQuery + ') on YouTube.';

            botReply.appendChild(instruction);
            botReply.appendChild(youtubeLink);
            botReplyContainer.appendChild(botReply);
            chatContainer.appendChild(botReplyContainer);
            chatContainer.scrollTop = chatContainer.scrollHeight;

            // Clear the input
            document.getElementById('user-input').value = '';

            // Start speech recognition
            startSpeechRecognition();
            return;
        }



        if (userInput.startsWith('')) {
            const searchData = userInput.replace('', '').trim();
            document.getElementById('user-input').value = '';
            handleSearch(searchData);
        } else if (userInput !== '') {
            document.getElementById('user-input').value = '';
            const chatContainer = document.getElementById('chat-container');
            const userMessageContainer = document.createElement('div');
            userMessageContainer.className = 'message-container';
            const userMessage = document.createElement('div');
            userMessage.className = 'message user-message';
            userMessage.innerHTML = processText(userInput);
            userMessageContainer.appendChild(userMessage);
            chatContainer.appendChild(userMessageContainer);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            document.getElementById('user-input').value = '';
        }
    }

    async function getReply(userInput) {
        const result = await model.generateContent(userInput);
        const response = await result.response;
        let processedText = response.text();
        // Define the regular expression to match words between two stars
        const boldWordsRegex = /\*\*(.*?)\*\*/g;
        // Replace words between two stars with bold formatting and add newline after each bold text
        processedText = processedText.replace(boldWordsRegex, '<br><strong>$1</strong>:<br>');
        // Remove the stars
        processedText = processedText.replace(/\*\*/g, '');
        return processedText;
    }

    function processText(text) {
        // Define the regular expression to match the main points
        const mainPointsRegex = /\\(.+?)\\/g;
        // Replace the main points with bold formatting
        const processedText = text.replace(mainPointsRegex, '<strong>$1</strong>');
        return processedText;
    }


    document.getElementById('send-button').addEventListener('click', sendMessage);
    document.getElementById('mic-button').addEventListener('click', toggleSpeechRecognition);
    document.getElementById('user-input').addEventListener('keypress', handleInput);
    window.addEventListener('load', startSpeechRecognition);