import logging

class NullHandler(logging.Handler):
    def handle(self, record):
        #print 'HANDLER!', record
        pass

def null_log(name):
    logger = logging.getLogger(name)
    logger.addHandler(NullHandler())
    logger.setLevel(logging.DEBUG)
