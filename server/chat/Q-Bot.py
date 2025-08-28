import requests
import json
import os
import time
import re
import threading
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

class Questionnaire:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
        self.headers = {
            'Content-Type': 'application/json',
            'X-goog-api-key': self.api_key
        }
        
        # Get the current working directory (should be data directory)
        self.data_dir = os.getcwd()
        self.answers_file = os.path.join(self.data_dir, "enhanced_summary.txt")
        
        self.collected_answers = []
        self.max_retries = 3
        
        # Web UI state
        self.current_session = {
            'questions': [],
            'current_question_idx': 0,
            'correctly_answered': set(),
            'incorrectly_answered': set(),
            'summary_content': '',
            'chat_history': [],
            'is_running': False
        }
    
    def read_file(self, filename):
        """Read content from a file"""
        try:
            with open(filename, 'r', encoding='utf-8') as file:
                return file.read().strip()
        except FileNotFoundError:
            print(f"ERROR: File '{filename}' not found.")
            return None
        except Exception as e:
            print(f"ERROR: Error reading file '{filename}': {e}")
            return None
    
    def convert_html_to_text(self, content):
        """Convert any coded content (HTML, XML, JSON, Markdown, etc.) to plain text"""
        if not content:
            return content
        
        original_content = content
        
        # Check if content contains any coding patterns
        has_html = '<' in content and '>' in content
        has_json = ('{' in content and '}' in content) or ('[' in content and ']' in content)
        has_markdown = any(marker in content for marker in ['##', '**', '*', '```', '---', '|'])
        has_xml = '<?xml' in content.lower() or has_html
        
        if not (has_html or has_json or has_markdown or has_xml):
            return content
        
        print("Converting coded content to plain text...")
        
        # Handle JSON-like structures
        if has_json:
            # Remove JSON syntax while keeping values
            content = re.sub(r'[{}[\]"]', '', content)
            content = re.sub(r'[:,]', ' ', content)
        
        # Handle Markdown
        if has_markdown:
            # Convert markdown headers
            content = re.sub(r'^#{1,6}\s*(.+)$', r'\1', content, flags=re.MULTILINE)
            # Convert bold/italic
            content = re.sub(r'\*\*(.+?)\*\*', r'\1', content)
            content = re.sub(r'\*(.+?)\*', r'\1', content)
            # Convert code blocks
            content = re.sub(r'```[\s\S]*?```', '', content)
            content = re.sub(r'`(.+?)`', r'\1', content)
            # Convert tables
            content = re.sub(r'\|', ' ', content)
            content = re.sub(r'^[-\s|]+$', '', content, flags=re.MULTILINE)
        
        # Handle HTML/XML (enhanced version)
        if has_html or has_xml:
            # Remove XML declarations
            content = re.sub(r'<\?xml[^>]*\?>', '', content, flags=re.IGNORECASE)
            
            # Remove style and script tags completely
            content = re.sub(r'<(style|script)[^>]*>.*?</\1>', '', content, flags=re.DOTALL | re.IGNORECASE)
            
            # Convert specific HTML elements to text equivalents
            content = re.sub(r'<br\s*/?>', '\n', content, flags=re.IGNORECASE)
            content = re.sub(r'<hr\s*/?>', '\n---\n', content, flags=re.IGNORECASE)
            content = re.sub(r'<p[^>]*>', '\n', content, flags=re.IGNORECASE)
            content = re.sub(r'</p>', '\n', content, flags=re.IGNORECASE)
            content = re.sub(r'<div[^>]*>', '\n', content, flags=re.IGNORECASE)
            content = re.sub(r'</div>', '\n', content, flags=re.IGNORECASE)
            
            # Handle lists
            content = re.sub(r'<li[^>]*>', '• ', content, flags=re.IGNORECASE)
            content = re.sub(r'</li>', '\n', content, flags=re.IGNORECASE)
            content = re.sub(r'<[ou]l[^>]*>', '\n', content, flags=re.IGNORECASE)
            content = re.sub(r'</[ou]l>', '\n', content, flags=re.IGNORECASE)
            
            # Handle headers
            content = re.sub(r'<h[1-6][^>]*>', '\n\n', content, flags=re.IGNORECASE)
            content = re.sub(r'</h[1-6]>', '\n', content, flags=re.IGNORECASE)
            
            # Handle tables
            content = re.sub(r'<table[^>]*>', '\n', content, flags=re.IGNORECASE)
            content = re.sub(r'</table>', '\n', content, flags=re.IGNORECASE)
            content = re.sub(r'<tr[^>]*>', '\n', content, flags=re.IGNORECASE)
            content = re.sub(r'</tr>', '', content, flags=re.IGNORECASE)
            content = re.sub(r'<t[hd][^>]*>', ' | ', content, flags=re.IGNORECASE)
            content = re.sub(r'</t[hd]>', '', content, flags=re.IGNORECASE)
            content = re.sub(r'<thead[^>]*>.*?</thead>', '', content, flags=re.DOTALL | re.IGNORECASE)
            content = re.sub(r'<tbody[^>]*>', '', content, flags=re.IGNORECASE)
            content = re.sub(r'</tbody>', '', content, flags=re.IGNORECASE)
            
            # Remove all remaining HTML/XML tags
            content = re.sub(r'<[^>]+>', '', content)
        
        # Handle common coding artifacts
        content = re.sub(r'&[a-zA-Z]+;', '', content)  # HTML entities
        content = re.sub(r'&#\d+;', '', content)  # Numeric entities
        content = re.sub(r'&lt;', '<', content)
        content = re.sub(r'&gt;', '>', content)
        content = re.sub(r'&amp;', '&', content)
        content = re.sub(r'&quot;', '"', content)
        content = re.sub(r'&#39;', "'", content)
        content = re.sub(r'&nbsp;', ' ', content)
        
        # Clean up programming syntax
        content = re.sub(r'[{}()[\];]', ' ', content)  # Remove common programming symbols
        content = re.sub(r'[=><]+', ' ', content)  # Remove comparison operators
        content = re.sub(r'[+\-*/]+', ' ', content)  # Remove math operators
        
        # Clean up whitespace and formatting
        content = re.sub(r'\n\s*\n\s*\n+', '\n\n', content)  # Multiple newlines to double
        content = re.sub(r'[ \t]+', ' ', content)  # Multiple spaces/tabs to single space
        content = re.sub(r'\n[ \t]+', '\n', content)  # Remove leading spaces on lines
        content = re.sub(r'[ \t]+\n', '\n', content)  # Remove trailing spaces on lines
        
        # Remove question marks or emojis that might be rendering issues
        content = re.sub(r'\?{2,}', '', content)  # Multiple question marks
        content = re.sub(r'[^\w\s\.,!?\-\n]', ' ', content)  # Remove special characters except basic punctuation
        
        # Final cleanup
        content = content.strip()
        content = re.sub(r'\n{3,}', '\n\n', content)  # Max 2 consecutive newlines
        
        # If content became too short or empty, return original
        if len(content) < len(original_content) * 0.1:  # If we lost more than 90% of content
            print("WARNING: Content reduction too aggressive, keeping more of original structure...")
            content = original_content
            # Just remove obvious HTML tags in this case
            content = re.sub(r'<[^>]+>', '', content)
            content = re.sub(r'&[a-zA-Z]+;', ' ', content)
            content = re.sub(r'[ \t]+', ' ', content)
            content = content.strip()
        
        print("DONE: Coded content converted to plain text")
        return content
    
    def call_gemini_api(self, prompt, retries=0):
        """Make API call to Gemini with retry logic"""
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ]
        }
        
        try:
            response = requests.post(self.base_url, headers=self.headers, json=payload, timeout=30)
            
            if response.status_code == 429:  # Rate limit
                if retries < self.max_retries:
                    wait_time = (2 ** retries) * 2  # Exponential backoff
                    print(f"WAIT: Rate limit hit. Waiting {wait_time} seconds before retry...")
                    time.sleep(wait_time)
                    return self.call_gemini_api(prompt, retries + 1)
                else:
                    print("ERROR: Rate limit exceeded. Please try again later.")
                    return None
            
            if response.status_code == 503:  # Service unavailable
                if retries < self.max_retries:
                    wait_time = (2 ** retries) * 3  # Longer wait for 503
                    print(f"WAIT: Service temporarily unavailable. Waiting {wait_time} seconds before retry...")
                    time.sleep(wait_time)
                    return self.call_gemini_api(prompt, retries + 1)
                else:
                    print("ERROR: Service unavailable. Please try again in a few minutes.")
                    return None
            
            response.raise_for_status()
            
            result = response.json()
            if 'candidates' in result and len(result['candidates']) > 0:
                return result['candidates'][0]['content']['parts'][0]['text']
            else:
                return "No response from Gemini API"
                
        except requests.exceptions.Timeout:
            print("TIMEOUT: Request timed out. Please check your internet connection.")
            return None
        except requests.exceptions.RequestException as e:
            print(f"ERROR: API request error: {e}")
            if "401" in str(e):
                print("KEY ERROR: Please check your API key is correct and has proper permissions.")
            return None
        except KeyError as e:
            print(f"ERROR: Error parsing API response: {e}")
            return None
    
    def analyze_files(self, summary_content, questions_content):
        """Analyze the summary and questions files using AI"""
        analysis_prompt = f"""
        Please analyze the following summary and questions:
        
        SUMMARY:
        {summary_content}
        
        QUESTIONS:
        {questions_content}
        
        Based on this analysis, please:
        1. Identify what information is missing from the summary that the questions are trying to gather
        2. For each question, suggest a clear way to ask it
        3. Provide what type of answer is expected
        
        Keep your response concise and structured. Focus on the actual topic and context provided in the summary.
        """
        
        return self.call_gemini_api(analysis_prompt)
    
    def analyze_multi_question_answer(self, all_questions, current_question, user_answer, summary_content):
        """Analyze if user's answer covers multiple questions or different questions"""
        questions_text = "\n".join([f"{i+1}. {q}" for i, q in enumerate(all_questions)])
        
        analysis_prompt = f"""
        CONTEXT: {summary_content}
        
        ALL QUESTIONS:
        {questions_text}
        
        CURRENT QUESTION ASKED: {current_question}
        USER'S ANSWER: {user_answer}
        
        Analyze the user's answer and determine:
        
        1. Does the answer address the current question asked?
        2. Does the answer address any OTHER questions from the list?
        3. Extract specific information for each question the answer addresses.
        
        Respond in this EXACT format:
        CURRENT_QUESTION: [YES/NO] - [explanation]
        OTHER_QUESTIONS: [List question numbers and extracted answers, or NONE]
        
        Example format for OTHER_QUESTIONS:
        - Question 2: [extracted answer]
        - Question 5: [extracted answer]
        OR
        OTHER_QUESTIONS: NONE
        """
        
        return self.call_gemini_api(analysis_prompt)
    
    def validate_answer(self, question, user_answer, summary_content):
        """Validate if the user's answer is relevant and correct"""
        validation_prompt = f"""
        Given the following context and question:
        
        CONTEXT/SUMMARY: {summary_content}
        QUESTION: {question}
        USER ANSWER: {user_answer}
        
        Please evaluate if the user's answer is:
        1. Relevant to the specific question asked
        2. Reasonable and makes sense in the context
        3. Addresses what the question is asking for
        4. Is a plausible answer even if not explicitly mentioned in the context
        
        IMPORTANT: The context is just stating that the person knows certain information, but doesn't provide the actual details. The user's job is to PROVIDE those missing details. So if the context says "I know what food he likes, it's an Indian dish" and the question asks "What kind of food does Naveen like?" then ANY reasonable Indian dish name should be VALID.
        
        Be generous in validation - accept reasonable answers that fit the context type, don't require exact matches.
        
        Respond with either "VALID: [brief explanation]" or "INVALID: [brief explanation of why it's wrong]"
        """
        
        return self.call_gemini_api(validation_prompt)
    
    def save_answer(self, question, answer):
        """Save valid answer to the answers file"""
        try:
            with open(self.answers_file, 'a', encoding='utf-8') as file:
                timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
                file.write(f"[{timestamp}]\n")
                file.write(f"Q: {question}\n")
                file.write(f"A: {answer}\n")
                file.write("-" * 50 + "\n\n")
            print(f"SAVED: Answer saved to {self.answers_file}")
        except Exception as e:
            print(f"ERROR: Error saving answer: {e}")
    
    def generate_enhanced_summary(self, original_summary, collected_answers):
        """Generate an enhanced summary using the original summary and collected answers"""
        if not collected_answers:
            return original_summary
            
        answers_text = "\n".join([f"- {qa['question']}: {qa['answer']}" for qa in collected_answers])
        
        enhancement_prompt = f"""
        You must create an enhanced summary by combining ONLY the original summary with the user's specific answers. Do NOT add any external knowledge or information that wasn't provided.

        ORIGINAL SUMMARY:
        {original_summary}

        USER'S ANSWERS TO QUESTIONS:
        {answers_text}

        STRICT INSTRUCTIONS:
        do's :
        1. Keep the EXACT same format as the original summary - each piece of information on separate lines
        2. Replace the general statements with specific information from the user's answers
        3. Do NOT combine multiple lines into paragraphs
        4. Do NOT add any external knowledge, facts, or information not mentioned by the user
        5. Do NOT elaborate beyond what the user actually said
        6. Keep the same simple, direct style as the original
        7. Add the user's information (the answers) where it's relevant in the original summary
        8. ADD PROPER PUNCTUATION AND GRAMMAR - fix missing periods, commas, and capitalization to make it grammatically correct
        9. Check for spelling mistake and correct them based on context
        10. add the user's answer like it was meant to be there in original summary like it was always part of it.

        don'ts :
        1. do not add additional information that wasn't provided by the user
        2. do not add the text "the user said" or similar phrases
        3. do not add the answers and questions as a list or separate section - integrate them into the summary naturally

        maintain the same structure as the original, but make it grammatically correct with proper punctuation.
        """
        
        enhanced_summary = self.call_gemini_api(enhancement_prompt)
        
        # Fallback if API fails
        if not enhanced_summary:
            print("WARNING: AI enhancement failed. Creating basic enhanced summary...")
            enhanced_summary = self.create_fallback_summary(original_summary, collected_answers)
        
        return enhanced_summary
    
    def create_fallback_summary(self, original_summary, collected_answers):
        """Create a basic enhanced summary without AI if API fails"""
        enhanced = original_summary
        
        if collected_answers:
            enhanced += "\n\nAdditional information gathered:\n"
            for qa in collected_answers:
                enhanced += f"- {qa['question']}: {qa['answer']}\n"
        
        return enhanced
    
    def display_progress(self, current, total):
        """Display progress bar"""
        percentage = (current / total) * 100
        bar_length = 20
        filled_length = int(bar_length * current // total)
        bar = '*' * filled_length + '-' * (bar_length - filled_length)
        print(f"\nProgress: [{bar}] {percentage:.1f}% ({current}/{total} questions)")
    
    def run_questionnaire(self):
        """Main function to run the interactive questionnaire"""
        print("=== Questionnaire Bot ===")
        print("Enhanced Summary Generation System\n")
        
        # Read files
        print("Reading files...")
        summary_content = self.read_file("summary.txt")
        questions_content = self.read_file("question.txt")
        
        if not summary_content or not questions_content:
            print("ERROR: Could not read required files. Please ensure 'summary.txt' and 'question.txt' exist.")
            return
        
        # Convert HTML summary to plain text if needed
        original_summary = summary_content
        summary_content = self.convert_html_to_text(summary_content)
        
        print("DONE: Files loaded successfully!")
        print(f"Summary: {len(summary_content)} characters")
        print(f"Questions file: {len(questions_content)} characters\n")
        
        print("Analyzing files with AI...")
        analysis = self.analyze_files(summary_content, questions_content)
        
        if analysis:
            print("AI Analysis:")
            print("-" * 50)
            print(analysis)
            print("-" * 50 + "\n")
        else:
            print("WARNING: Could not get AI analysis, but continuing with questionnaire...\n")
        
        # Parse questions from the questions file
        questions = []
        for line in questions_content.split('\n'):
            line = line.strip()
            if line and not line.startswith('#'):
                # Clean up the question format
                if line[0].isdigit():
                    question = line.split('.', 1)[-1].strip()
                else:
                    question = line
                # Only add non-empty questions
                if question:
                    questions.append(question)
        
        if not questions:
            print("ERROR: No valid questions found in questions.txt")
            return
        
        print(f"Found {len(questions)} questions to ask\n")
        print("Instructions:")
        print("   - Answer each question to the best of your knowledge")
        print("   - AI will validate your answers for accuracy")
        print("   - Type 'quit', 'exit', or 'stop' to end early")
        print("   - Valid answers will be saved automatically")
        print("   - Correctly answered questions will be skipped")
        print("   - Wrong answers will be asked again\n")
        
        # Clear previous answers file
        if os.path.exists(self.answers_file):
            os.remove(self.answers_file)
            print(f"CLEARED: Previous {self.answers_file}\n")
        
        # Add header to answers file
        with open(self.answers_file, 'w', encoding='utf-8') as file:
            file.write("AI QUESTIONNAIRE RESULTS\n")
            file.write("=" * 40 + "\n")
            file.write(f"Session started: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            file.write(f"Total questions: {len(questions)}\n\n")
        
        # Enhanced tracking system
        correctly_answered = set()   # Questions answered correctly
        incorrectly_answered = set() # Questions answered incorrectly (need re-asking)
        question_attempts = {}       # Track attempts per question
        
        # Continue until all questions are correctly answered
        while len(correctly_answered) < len(questions):
            # Find next question to ask
            current_question_idx = None
            
            # Priority 1: Questions that were answered incorrectly (re-ask)
            for i in range(len(questions)):
                if i in incorrectly_answered and i not in correctly_answered:
                    current_question_idx = i
                    break
            
            # Priority 2: Questions not yet attempted
            if current_question_idx is None:
                for i in range(len(questions)):
                    if i not in correctly_answered and i not in incorrectly_answered:
                        current_question_idx = i
                        break
            
            # If somehow we can't find a question, break (shouldn't happen)
            if current_question_idx is None:
                break
            
            question = questions[current_question_idx]
            
            # Initialize attempts counter for this question if not exists
            if current_question_idx not in question_attempts:
                question_attempts[current_question_idx] = 0
            
            self.display_progress(len(correctly_answered), len(questions))
            
            # Show different messages for re-asking vs first time
            if current_question_idx in incorrectly_answered:
                print(f"\nRe-asking Question {current_question_idx+1} (previous answer was incorrect):")
            else:
                print(f"\nQuestion {current_question_idx+1} of {len(questions)}:")
            
            print(f"Q: {question}")
            
            # Get user answer
            user_answer = input("\nYour answer: ").strip()
            
            if not user_answer:
                print("WARNING: Please provide an answer.")
                continue
            
            if user_answer.lower() in ['quit', 'exit', 'stop']:
                print("\nQuestionnaire stopped by user.")
                break
            
            question_attempts[current_question_idx] += 1
            print("Analyzing your answer for multiple questions...")
            
            # Check if answer covers multiple questions or different questions
            multi_analysis = self.analyze_multi_question_answer(questions, question, user_answer, summary_content)
            
            if multi_analysis:
                print(f"\nMulti-Question Analysis:")
                print(multi_analysis)
                
                # Parse the analysis
                lines = multi_analysis.split('\n')
                current_answered_correctly = False
                other_answers = []
                
                for line in lines:
                    if line.startswith("CURRENT_QUESTION:"):
                        if "YES" in line.upper():
                            current_answered_correctly = True
                    elif line.startswith("- Question"):
                        # Extract question number and answer
                        parts = line.split(': ', 1)
                        if len(parts) == 2:
                            q_part = parts[0].replace("- Question", "").strip()
                            answer_part = parts[1].strip()
                            try:
                                q_num = int(q_part) - 1  # Convert to 0-based index
                                if 0 <= q_num < len(questions):
                                    other_answers.append((q_num, answer_part))
                            except ValueError:
                                pass
                
                # Handle current question
                if current_answered_correctly:
                    print("CORRECT: Answer addresses the current question!")
                    validation = self.validate_answer(question, user_answer, summary_content)
                    print(f"VALIDATION: {validation}")  # Show validation reason
                    
                    if validation and validation.upper().startswith("VALID"):
                        # Current question answered correctly
                        self.collected_answers.append({
                            'question': question,
                            'answer': user_answer,
                            'timestamp': time.strftime("%Y-%m-%d %H:%M:%S")
                        })
                        correctly_answered.add(current_question_idx)
                        # Remove from incorrectly answered if it was there
                        incorrectly_answered.discard(current_question_idx)
                        print("ACCEPTED: Current question answer accepted and stored!")
                    else:
                        print("INVALID: Answer not valid for current question.")
                        incorrectly_answered.add(current_question_idx)
                        print(f"RETRY: Question {current_question_idx+1} marked for re-asking")
                else:
                    # Current question not answered or answered incorrectly
                    print("INCORRECT: Answer doesn't address the current question correctly.")
                    incorrectly_answered.add(current_question_idx)
                    print(f"RETRY: Question {current_question_idx+1} marked for re-asking")
                
                # Handle other questions answered
                if other_answers:
                    print(f"\nFOUND: Found answers to {len(other_answers)} other questions!")
                    for q_idx, extracted_answer in other_answers:
                        if q_idx not in correctly_answered:  # Only process if not already correctly answered
                            # Validate the extracted answer
                            other_validation = self.validate_answer(questions[q_idx], extracted_answer, summary_content)
                            print(f"VALIDATION for Question {q_idx+1}: {other_validation}")  # Show validation reason
                            
                            if other_validation and other_validation.upper().startswith("VALID"):
                                self.collected_answers.append({
                                    'question': questions[q_idx],
                                    'answer': extracted_answer,
                                    'timestamp': time.strftime("%Y-%m-%d %H:%M:%S")
                                })
                                correctly_answered.add(q_idx)
                                # Remove from incorrectly answered if it was there
                                incorrectly_answered.discard(q_idx)
                                print(f"AUTO-ANSWERED: Question {q_idx+1} automatically answered correctly: {questions[q_idx][:50]}...")
                            else:
                                print(f"INVALID: Extracted answer for Question {q_idx+1} is invalid")
                                incorrectly_answered.add(q_idx)
            else:
                print("ERROR: Could not analyze answer properly.")
                incorrectly_answered.add(current_question_idx)
                print(f"RETRY: Question {current_question_idx+1} marked for re-asking")
            
            # Show current status
            print(f"\nSTATUS: {len(correctly_answered)}/{len(questions)} questions answered correctly")
            if incorrectly_answered:
                remaining_wrong = [i+1 for i in incorrectly_answered if i not in correctly_answered]
                if remaining_wrong:
                    print(f"RETRY: Questions to re-ask: {remaining_wrong}")
        
        print(f"\nCOMPLETE: All questions answered correctly!")
        self.display_progress(len(questions), len(questions))
        
        # Calculate valid answers
        valid_answers = len(correctly_answered)
        
        # Final summary
        print(f"\nCOMPLETE: Questionnaire completed!")
        print(f"VALID: Valid answers: {valid_answers}/{len(questions)}")
        
        if valid_answers > 0:
            print(f"\nSUCCESS: Success rate: {(valid_answers/len(questions)*100):.1f}%")
            print("\nGENERATING: Generating enhanced summary with AI...")
            
            # Generate enhanced summary
            enhanced_summary = self.generate_enhanced_summary(summary_content, self.collected_answers)
            
            if enhanced_summary:
                # Save the enhanced summary
                try:
                    with open(self.answers_file, 'w', encoding='utf-8') as file:
                        file.write("ENHANCED SUMMARY\n")
                        file.write("=" * 50 + "\n")
                        file.write(f"Generated on: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
                        file.write(f"Based on {valid_answers} validated answers\n")
                        file.write("=" * 50 + "\n\n")
                        file.write(enhanced_summary)
                        file.write("\n\n" + "=" * 50 + "\n")
                        file.write("ORIGINAL SUMMARY (PLAIN TEXT):\n")
                        file.write(summary_content)
                        file.write("\n\n" + "=" * 50 + "\n")
                        file.write("GATHERED INFORMATION:\n")
                        for qa in self.collected_answers:
                            file.write(f"Q: {qa['question']}\n")
                            file.write(f"A: {qa['answer']}\n")
                            file.write(f"Timestamp: {qa['timestamp']}\n\n")
                    
                    print(f"SAVED: Enhanced summary generated and saved to: '{self.answers_file}'")
                    print("\nSUMMARY: Summary Preview:")
                    print("-" * 30)
                    preview = enhanced_summary[:200] + "..." if len(enhanced_summary) > 200 else enhanced_summary
                    print(preview)
                    
                except Exception as e:
                    print(f"ERROR: Error saving enhanced summary: {e}")
            else:
                print("ERROR: Could not generate enhanced summary")
        else:
            print("\nNOTE: No valid answers collected. Original summary remains unchanged.")
        
        print(f"\nFILES: Results saved to: '{self.answers_file}'")

    def start_web_session(self):
        """Initialize web session with files"""
        # Read files
        summary_content = self.read_file("summary.txt")
        questions_content = self.read_file("question.txt")
        
        if not summary_content or not questions_content:
            return {'success': False, 'error': 'Could not read required files'}
        
        # Convert HTML summary to plain text if needed
        summary_content = self.convert_html_to_text(summary_content)
        
        # Parse questions
        questions = []
        for line in questions_content.split('\n'):
            line = line.strip()
            if line and not line.startswith('#'):
                if line[0].isdigit():
                    question = line.split('.', 1)[-1].strip()
                else:
                    question = line
                if question:
                    questions.append(question)
        
        # Reset session
        self.current_session = {
            'questions': questions,
            'current_question_idx': 0,
            'correctly_answered': set(),
            'incorrectly_answered': set(),
            'summary_content': summary_content,
            'chat_history': [],
            'is_running': True
        }
        self.collected_answers = []
        
        return {
            'success': True,
            'summary': summary_content,
            'total_questions': len(questions),
            'first_question': questions[0] if questions else None
        }
    
    def get_next_question_web(self):
        """Get next question for web interface"""
        if not self.current_session['is_running']:
            return {'success': False, 'error': 'Session not started'}
        
        questions = self.current_session['questions']
        correctly_answered = self.current_session['correctly_answered']
        incorrectly_answered = self.current_session['incorrectly_answered']
        
        # Find next question to ask
        current_question_idx = None
        
        # Priority 1: Questions that were answered incorrectly (re-ask)
        for i in range(len(questions)):
            if i in incorrectly_answered and i not in correctly_answered:
                current_question_idx = i
                break
        
        # Priority 2: Questions not yet attempted
        if current_question_idx is None:
            for i in range(len(questions)):
                if i not in correctly_answered and i not in incorrectly_answered:
                    current_question_idx = i
                    break
        
        if current_question_idx is None:
            # All questions answered
            return {
                'success': True,
                'completed': True,
                'progress': len(correctly_answered),
                'total': len(questions)
            }
        
        self.current_session['current_question_idx'] = current_question_idx
        question = questions[current_question_idx]
        is_retry = current_question_idx in incorrectly_answered
        
        return {
            'success': True,
            'question': question,
            'question_number': current_question_idx + 1,
            'total_questions': len(questions),
            'progress': len(correctly_answered),
            'is_retry': is_retry,
            'completed': False
        }
    
    def submit_answer_web(self, user_answer):
        """Submit answer for web interface"""
        if not self.current_session['is_running']:
            return {'success': False, 'error': 'Session not started'}
        
        if not user_answer.strip():
            return {'success': False, 'error': 'Please provide an answer'}
        
        questions = self.current_session['questions']
        current_question_idx = self.current_session['current_question_idx']
        question = questions[current_question_idx]
        
        # Check if answer covers multiple questions using the original AI analysis
        multi_analysis = self.analyze_multi_question_answer(
            questions, question, user_answer, self.current_session['summary_content']
        )
        
        results = {'auto_answered': []}
        
        if multi_analysis:
            # Parse the analysis
            lines = multi_analysis.split('\n')
            current_answered_correctly = False
            other_answers = []
            
            for line in lines:
                if line.startswith("CURRENT_QUESTION:"):
                    if "YES" in line.upper():
                        current_answered_correctly = True
                elif line.startswith("- Question"):
                    # Extract question number and answer
                    parts = line.split(': ', 1)
                    if len(parts) == 2:
                        q_part = parts[0].replace("- Question", "").strip()
                        answer_part = parts[1].strip()
                        try:
                            q_num = int(q_part) - 1  # Convert to 0-based index
                            if 0 <= q_num < len(questions):
                                other_answers.append((q_num, answer_part))
                        except ValueError:
                            pass
            
            # Handle current question
            if current_answered_correctly:
                validation = self.validate_answer(question, user_answer, self.current_session['summary_content'])
                
                if validation and validation.upper().startswith("VALID"):
                    # Current question answered correctly
                    self.collected_answers.append({
                        'question': question,
                        'answer': user_answer,
                        'timestamp': time.strftime("%Y-%m-%d %H:%M:%S")
                    })
                    self.current_session['correctly_answered'].add(current_question_idx)
                    self.current_session['incorrectly_answered'].discard(current_question_idx)
                    results['current_valid'] = True
                else:
                    self.current_session['incorrectly_answered'].add(current_question_idx)
                    results['current_valid'] = False
            else:
                # Current question not answered correctly
                self.current_session['incorrectly_answered'].add(current_question_idx)
                results['current_valid'] = False
            
            # Handle other questions answered
            if other_answers:
                for q_idx, extracted_answer in other_answers:
                    if q_idx not in self.current_session['correctly_answered']:
                        # Validate the extracted answer
                        other_validation = self.validate_answer(
                            questions[q_idx], extracted_answer, self.current_session['summary_content']
                        )
                        
                        if other_validation and other_validation.upper().startswith("VALID"):
                            self.collected_answers.append({
                                'question': questions[q_idx],
                                'answer': extracted_answer,
                                'timestamp': time.strftime("%Y-%m-%d %H:%M:%S")
                            })
                            self.current_session['correctly_answered'].add(q_idx)
                            self.current_session['incorrectly_answered'].discard(q_idx)
                            results['auto_answered'].append({
                                'question_number': q_idx + 1,
                                'question': questions[q_idx],
                                'answer': extracted_answer
                            })
        else:
            # If multi-analysis failed, fall back to simple validation
            validation = self.validate_answer(question, user_answer, self.current_session['summary_content'])
            
            if validation and validation.upper().startswith("VALID"):
                self.collected_answers.append({
                    'question': question,
                    'answer': user_answer,
                    'timestamp': time.strftime("%Y-%m-%d %H:%M:%S")
                })
                self.current_session['correctly_answered'].add(current_question_idx)
                self.current_session['incorrectly_answered'].discard(current_question_idx)
                results['current_valid'] = True
            else:
                self.current_session['incorrectly_answered'].add(current_question_idx)
                results['current_valid'] = False
        
        # Prepare response
        if results.get('current_valid', False):
            message = 'Correct!'
            if results['auto_answered']:
                auto_list = ', '.join([f"Q{item['question_number']}" for item in results['auto_answered']])
                message += f' Also automatically answered: {auto_list}'
            message += ' Moving to next question...'
            
            return {
                'success': True,
                'valid': True,
                'message': message,
                'progress': len(self.current_session['correctly_answered']),
                'total': len(questions),
                'auto_answered': results['auto_answered']
            }
        else:
            message = 'Please try again with a different answer.'
            if results['auto_answered']:
                auto_list = ', '.join([f"Q{item['question_number']}" for item in results['auto_answered']])
                message = f'Your answer helped with other questions ({auto_list}), but please answer the current question more specifically.'
            
            return {
                'success': True,
                'valid': False,
                'message': message,
                'progress': len(self.current_session['correctly_answered']),
                'total': len(questions),
                'auto_answered': results['auto_answered']
            }
    
    def complete_questionnaire_web(self):
        """Complete questionnaire for web interface"""
        if not self.current_session['is_running']:
            return {'success': False, 'error': 'Session not started'}
        
        # Generate enhanced summary
        enhanced_summary = self.generate_enhanced_summary(
            self.current_session['summary_content'], 
            self.collected_answers
        )
        
        # Save results
        if enhanced_summary:
            try:
                with open(self.answers_file, 'w', encoding='utf-8') as file:
                    file.write("ENHANCED SUMMARY\n")
                    file.write("=" * 50 + "\n")
                    file.write(f"Generated on: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
                    file.write(f"Based on {len(self.collected_answers)} validated answers\n")
                    file.write("=" * 50 + "\n\n")
                    file.write(enhanced_summary)
                    file.write("\n\n" + "=" * 50 + "\n")
                    file.write("ORIGINAL SUMMARY:\n")
                    file.write(self.current_session['summary_content'])
                    file.write("\n\n" + "=" * 50 + "\n")
                    file.write("GATHERED INFORMATION:\n")
                    for qa in self.collected_answers:
                        file.write(f"Q: {qa['question']}\n")
                        file.write(f"A: {qa['answer']}\n")
                        file.write(f"Timestamp: {qa['timestamp']}\n\n")
            except Exception as e:
                return {'success': False, 'error': f'Error saving results: {e}'}
        
        self.current_session['is_running'] = False
        
        return {
            'success': True,
            'enhanced_summary': enhanced_summary,
            'total_answers': len(self.collected_answers),
            'total_questions': len(self.current_session['questions'])
        }

def main():
    # API key provided by user
    api_key = "AIzaSyCbiRgEQXJsHohfaSth_5C3Vhz8uOmdj3Q"
    
    if not api_key or api_key == "YOUR_API_KEY_HERE":
        print("ERROR: Please provide a valid Gemini API key.")
        print("KEY INFO: Get your API key from: https://makersuite.google.com/app/apikey")
        return
    
    print("STARTING: Initializing Questionnaire Bot Web Interface...")
    start_web_interface(api_key)

# Global bot instance for web interface
web_bot = None

class WebHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(get_html_content().encode())
        elif self.path == '/api/start':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            result = web_bot.start_web_session()
            self.wfile.write(json.dumps(result).encode())
        elif self.path == '/api/next-question':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            result = web_bot.get_next_question_web()
            self.wfile.write(json.dumps(result).encode())
        elif self.path == '/api/complete':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            result = web_bot.complete_questionnaire_web()
            self.wfile.write(json.dumps(result).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        if self.path == '/api/submit-answer':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length).decode('utf-8')
            data = urllib.parse.parse_qs(post_data)
            answer = data.get('answer', [''])[0]
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            result = web_bot.submit_answer_web(answer)
            self.wfile.write(json.dumps(result).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        # Suppress server logs
        pass

def get_html_content():
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Questionnaire Bot</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f6fa;
            display: flex;
            height: 100vh;
        }

        .sidebar {
            width: 350px;
            background-color: #e8f4f8;
            border-right: 1px solid #d3d3d3;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .sidebar-section {
            padding: 20px;
            border-bottom: 1px solid #d3d3d3;
        }

        .sidebar-section h3 {
            color: #333;
            margin-bottom: 10px;
            font-size: 16px;
            font-weight: 600;
        }

        .summary-content {
            background-color: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            font-size: 14px;
            line-height: 1.5;
            color: #555;
            max-height: 200px;
            overflow-y: auto;
        }

        .context-history {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }

        .main-chat {
            flex: 1;
            display: flex;
            flex-direction: column;
            background-color: white;
        }

        .chat-header {
            background-color: #4a90e2;
            color: white;
            padding: 20px;
            text-align: center;
        }

        .chat-header h1 {
            font-size: 24px;
            margin-bottom: 5px;
        }

        .progress-info {
            font-size: 14px;
            opacity: 0.9;
        }

        .progress-bar {
            width: 100%;
            height: 4px;
            background-color: rgba(255, 255, 255, 0.3);
            margin-top: 10px;
            border-radius: 2px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background-color: white;
            width: 0%;
            transition: width 0.3s ease;
        }

        .chat-container {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .message {
            padding: 15px 20px;
            border-radius: 12px;
            max-width: 80%;
            word-wrap: break-word;
        }

        .message.bot {
            background-color: #f1f3f4;
            align-self: flex-start;
            border: 1px solid #e0e0e0;
        }

        .message.user {
            background-color: #4a90e2;
            color: white;
            align-self: flex-end;
        }

        .message.validation {
            align-self: center;
            text-align: center;
            font-weight: 500;
            border-radius: 20px;
            padding: 10px 20px;
            font-size: 14px;
        }

        .message.validation.correct {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .message.validation.incorrect {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }

        .input-area {
            padding: 20px;
            background-color: #f8f9fa;
            border-top: 1px solid #e0e0e0;
        }

        .input-container {
            display: flex;
            gap: 10px;
            max-width: 100%;
        }

        .answer-input {
            flex: 1;
            padding: 12px 16px;
            border: 1px solid #d0d7de;
            border-radius: 8px;
            font-size: 16px;
            outline: none;
            resize: none;
            min-height: 50px;
            max-height: 120px;
        }

        .answer-input:focus {
            border-color: #4a90e2;
            box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
        }

        .submit-btn {
            padding: 12px 24px;
            background-color: #4a90e2;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 500;
            transition: background-color 0.2s;
        }

        .submit-btn:hover {
            background-color: #357abd;
        }

        .submit-btn:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }

        .start-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;
            padding: 40px;
            text-align: center;
        }

        .start-btn {
            padding: 15px 30px;
            background-color: #4a90e2;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 18px;
            font-weight: 500;
            margin-top: 20px;
        }

        .completion-message {
            text-align: center;
            padding: 40px 20px;
            background-color: #d4edda;
            color: #155724;
            border-radius: 12px;
            margin: 20px;
            border: 1px solid #c3e6cb;
        }
    </style>
</head>
<body>
    <div class="sidebar">
        <div class="sidebar-section">
            <h3>Summary</h3>
            <div class="summary-content" id="summaryContent">
                Click "Start Questionnaire" to begin...
            </div>
        </div>
        <div class="context-history">
            <h3>Context History</h3>
            <div id="contextHistory">
                No context history yet...
            </div>
        </div>
    </div>

    <div class="main-chat">
        <div class="chat-header">
            <h1>Questionnaire Bot</h1>
            <div class="progress-info" id="progressInfo">Ready to start</div>
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
        </div>

        <div class="chat-container" id="chatContainer">
            <div class="start-screen" id="startScreen">
                <h2>Welcome to the Questionnaire Bot</h2>
                <p>I'll help you create an enhanced summary by asking you specific questions about the content.</p>
                <button class="start-btn" onclick="startQuestionnaire()">Start Questionnaire</button>
            </div>
        </div>

        <div class="input-area" id="inputArea" style="display: none;">
            <div class="input-container">
                <textarea 
                    class="answer-input" 
                    id="answerInput" 
                    placeholder="Type your answer here..."
                    onkeypress="handleKeyPress(event)"
                ></textarea>
                <button class="submit-btn" id="submitBtn" onclick="submitAnswer()">Submit</button>
            </div>
        </div>
    </div>

    <script>
        let currentQuestionData = null;

        async function startQuestionnaire() {
            try {
                const response = await fetch('/api/start');
                const data = await response.json();

                if (data.success) {
                    document.getElementById('summaryContent').textContent = data.summary;
                    document.getElementById('startScreen').style.display = 'none';
                    document.getElementById('inputArea').style.display = 'block';
                    
                    await getNextQuestion();
                } else {
                    alert('Error: ' + data.error);
                }
            } catch (error) {
                alert('Error starting questionnaire: ' + error.message);
            }
        }

        async function getNextQuestion() {
            try {
                const response = await fetch('/api/next-question');
                const data = await response.json();

                if (data.success) {
                    if (data.completed) {
                        await completeQuestionnaire();
                        return;
                    }

                    currentQuestionData = data;
                    updateProgress(data.progress, data.total_questions);
                    
                    const retryText = data.is_retry ? ' (Please try again)' : '';
                    addMessage('bot', `Question ${data.question_number} of ${data.total_questions}${retryText}: ${data.question}`);
                    
                    document.getElementById('answerInput').focus();
                } else {
                    alert('Error: ' + data.error);
                }
            } catch (error) {
                alert('Error getting question: ' + error.message);
            }
        }

        async function submitAnswer() {
            const answerInput = document.getElementById('answerInput');
            const answer = answerInput.value.trim();

            if (!answer) {
                alert('Please provide an answer');
                return;
            }

            setInputEnabled(false);
            addMessage('user', answer);

            try {
                const response = await fetch('/api/submit-answer', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: 'answer=' + encodeURIComponent(answer)
                });

                const data = await response.json();

                if (data.success) {
                    updateProgress(data.progress, data.total);
                    
                    if (data.valid) {
                        addMessage('validation correct', data.message);
                        
                        // Show auto-answered questions if any
                        if (data.auto_answered && data.auto_answered.length > 0) {
                            for (let item of data.auto_answered) {
                                addMessage('validation correct', `✓ Auto-answered Q${item.question_number}: ${item.question} → ${item.answer}`);
                            }
                        }
                        
                        answerInput.value = '';
                        setTimeout(() => {
                            getNextQuestion();
                        }, 1000);
                    } else {
                        addMessage('validation incorrect', data.message);
                        
                        // Show auto-answered questions if any
                        if (data.auto_answered && data.auto_answered.length > 0) {
                            for (let item of data.auto_answered) {
                                addMessage('validation correct', `✓ Auto-answered Q${item.question_number}: ${item.question} → ${item.answer}`);
                            }
                        }
                        
                        answerInput.value = '';
                        setTimeout(() => {
                            getNextQuestion();
                        }, 1500);
                    }
                } else {
                    alert('Error: ' + data.error);
                }
            } catch (error) {
                alert('Error submitting answer: ' + error.message);
            } finally {
                setInputEnabled(true);
            }
        }

        async function completeQuestionnaire() {
            try {
                const response = await fetch('/api/complete');
                const data = await response.json();

                if (data.success) {
                    document.getElementById('inputArea').style.display = 'none';
                    
                    const completionHTML = `
                        <div class="completion-message">
                            <h2>🎉 Questionnaire Completed!</h2>
                            <p>You've successfully answered ${data.total_answers} out of ${data.total_questions} questions.</p>
                            <p>Your enhanced summary has been generated and saved.</p>
                        </div>
                    `;
                    
                    document.getElementById('chatContainer').innerHTML += completionHTML;
                    updateProgress(data.total_questions, data.total_questions);
                } else {
                    alert('Error completing questionnaire: ' + data.error);
                }
            } catch (error) {
                alert('Error completing questionnaire: ' + error.message);
            }
        }

        function addMessage(type, content) {
            const chatContainer = document.getElementById('chatContainer');
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${type}`;
            messageDiv.textContent = content;
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        function updateProgress(current, total) {
            const percentage = total > 0 ? (current / total) * 100 : 0;
            document.getElementById('progressInfo').textContent = `Progress: ${current}/${total} questions (${percentage.toFixed(0)}%)`;
            document.getElementById('progressFill').style.width = `${percentage}%`;
        }

        function setInputEnabled(enabled) {
            document.getElementById('answerInput').disabled = !enabled;
            document.getElementById('submitBtn').disabled = !enabled;
        }

        function handleKeyPress(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                submitAnswer();
            }
        }

        document.getElementById('answerInput').addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
    </script>
</body>
</html>"""

def start_web_interface(api_key):
    global web_bot
    web_bot = Questionnaire(api_key)
    
    port = 8000
    server = HTTPServer(('localhost', port), WebHandler)
    
    print(f"Web interface starting at: http://localhost:{port}")
    print("Opening browser...")
    
    # Open browser in a separate thread
    threading.Timer(1, lambda: webbrowser.open(f'http://localhost:{port}')).start()
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        server.shutdown()

if __name__ == "__main__":
    main()
