# summarizer.py

import os
import re
import spacy
import subprocess
import sys
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.text_rank import TextRankSummarizer
from transformers import pipeline


# Load spaCy model (download if missing)
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    subprocess.check_call([sys.executable, "-m", "spacy", "download", "en_core_web_sm"])
    nlp = spacy.load("en_core_web_sm")

summarizer = pipeline("summarization", model="distilbart-cnn-12-6")
# summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

def clean_text(text):
    # Remove citation numbers
    return re.sub(r'\[\d+\]', '', text)

def fix_spacing(text):
    # Remove spaces before punctuation like . , ! ?
    return re.sub(r'\s+([.,!?])', r'\1', text)

def decide_num_sentences(text):
    length = len(text.split())
    num = max(3, min(15, length // 100))
    return num

def extract_key_sentences_textrank(text, num_sentences=5):
    parser = PlaintextParser.from_string(text, Tokenizer("english"))
    summarizer = TextRankSummarizer()
    summary = summarizer(parser.document, num_sentences)
    return " ".join(str(sentence) for sentence in summary)

def abstractive_summarize(text):
    summary = summarizer(text, do_sample=True)
    return summary[0]['summary_text']

def summarize(long_text):
    cleaned_text = clean_text(long_text)
    if len(cleaned_text.split()) < 200:
        # short text → transformer directly
        summary = abstractive_summarize(cleaned_text)
    else:
        num_sentences = decide_num_sentences(cleaned_text)
        extracted_text = extract_key_sentences_textrank(cleaned_text, num_sentences)
        summary = abstractive_summarize(extracted_text)
    return fix_spacing(summary)

if __name__ == "__main__":
    long_text = """
    The Internet (or internet)[a] is the global system of interconnected computer networks that uses the Internet protocol suite (TCP/IP)[b] to communicate between networks and devices. It is a network of networks that consists of private, public, academic, business, and government networks of local to global scope, linked by a broad array of electronic, wireless, and optical networking technologies. The Internet carries a vast range of information resources and services, such as the interlinked hypertext documents and applications of the World Wide Web (WWW), electronic mail, internet telephony, streaming media and file sharing.

    The origins of the Internet date back to research that enabled the time-sharing of computer resources, the development of packet switching in the 1960s and the design of computer networks for data communication.[2][3] The set of rules (communication protocols) to enable internetworking on the Internet arose from research and development commissioned in the 1970s by the Defense Advanced Research Projects Agency (DARPA) of the United States Department of Defense in collaboration with universities and researchers across the United States and in the United Kingdom and France.[4][5][6] The ARPANET initially served as a backbone for the interconnection of regional academic and military networks in the United States to enable resource sharing. The funding of the National Science Foundation Network as a new backbone in the 1980s, as well as private funding for other commercial extensions, encouraged worldwide participation in the development of new networking technologies and the merger of many networks using DARPA's Internet protocol suite.[7] The linking of commercial networks and enterprises by the early 1990s, as well as the advent of the World Wide Web,[8] marked the beginning of the transition to the modern Internet,[9] and generated sustained exponential growth as generations of institutional, personal, and mobile computers were connected to the internetwork. Although the Internet was widely used by academia in the 1980s, the subsequent commercialization of the Internet in the 1990s and beyond incorporated its services and technologies into virtually every aspect of modern life.

    Most traditional communication media, including telephone, radio, television, paper mail, and newspapers, are reshaped, redefined, or even bypassed by the Internet, giving birth to new services such as email, Internet telephone, Internet radio, Internet television, online music, digital newspapers, and audio and video streaming websites. Newspapers, books, and other print publishing have adapted to website technology or have been reshaped into blogging, web feeds, and online news aggregators. The Internet has enabled and accelerated new forms of personal interaction through instant messaging, Internet forums, and social networking services. Online shopping has grown exponentially for major retailers, small businesses, and entrepreneurs, as it enables firms to extend their "brick and mortar" presence to serve a larger market or even sell goods and services entirely online. Business-to-business and financial services on the Internet affect supply chains across entire industries.

    The Internet has no single centralized governance in either technological implementation or policies for access and usage; each constituent network sets its own policies.[10] The overarching definitions of the two principal name spaces on the Internet, the Internet Protocol address (IP address) space and the Domain Name System (DNS), are directed by a maintainer organization, the Internet Corporation for Assigned Names and Numbers (ICANN). The technical underpinning and standardization of the core protocols is an activity of the Internet Engineering Task Force (IETF), a non-profit organization of loosely affiliated international participants that anyone may associate with by contributing technical expertise.[11] In November 2006, the Internet was included on USA Today's list of the New Seven Wonders.[12]
    """

    result = summarize(long_text)
    print("Summary:\n", result)