class CreditCardReader {
    cardTypes = {
        3: "American Express",
        4: "Visa",
        5: "MasterCard",
        6: "Discover Card",
    };

    async getCardFromImage(imageSource) {
        if (!this.checkOpenCVReady()) {
            console.error("OpenCV not loaded");
            return;
        }

        if (!imageSource) {
            console.error("image not provided");
            return;
        }

        let refSize = new cv.Size(57, 88);
        let refDigits = await this.getReferenceDigits(refSize);

        var image = cv.imread(imageSource);
        this.resizeImage(image);

        let grayCard = new cv.Mat();
        cv.cvtColor(image, grayCard, cv.COLOR_BGR2GRAY);
        image.delete();

        let filteredCard = new cv.Mat();
        this.applyFilters(grayCard, filteredCard);

        let groupRectangles = this.findGroupsOfNumbers(filteredCard);

        var output = [];

        for (let i = 0; i < groupRectangles.length; ++i) {
            let groupOutput = this.findNumbersInGroup(
                groupRectangles[i],
                grayCard,
                refDigits,
                refSize
            );
            output.push(groupOutput.join(""));
        }

        const formattedNumber = output.join("");
        let cardType = "";

        if (formattedNumber.length > 0) {
            cardType = this.cardTypes[formattedNumber[0]];
        }

        return {
            type: cardType,
            number: formattedNumber,
            valid: this.validateCardNumber(formattedNumber),
        };
    }

    checkOpenCVReady() {
        return typeof cv !== "undefined";
    }

    loadReferenceNumbers() {
        return new Promise((resolve, reject) => {
            let img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(img);
            img.onerror = reject;
            img.src = "../assets/ocr_numbers.jpg";
        });
    }

    async getReferenceDigits(refSize) {
        if (!this.refImg) {
            this.refImg = await this.loadReferenceNumbers();
        }

        if (!this.refImg) {
            console.error("reference image not found");
            return;
        }

        let src = cv.imread(this.refImg);
        cv.cvtColor(src, src, cv.COLOR_BGR2GRAY);
        cv.threshold(src, src, 10, 255, cv.THRESH_BINARY_INV);

        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(
            src,
            contours,
            hierarchy,
            cv.RETR_EXTERNAL,
            cv.CHAIN_APPROX_SIMPLE
        );
        let rectangles = this.getRectangles(contours);
        contours.delete();
        hierarchy.delete();

        let digits = [];
        for (let i = 0; i < rectangles.length; ++i) {
            let digit = new cv.Mat();
            digit = src.roi(rectangles[i]);
            cv.resize(digit, digit, refSize);
            digits[i] = digit;
        }
        src.delete();
        return digits;
    }

    validateCardNumber(number) {
        const regex = new RegExp("^[0-9]{16}$");
        if (!regex.test(number)) {
            return false;
        }

        return this.luhnCheck(number);
    }

    luhnCheck(val) {
        let sum = 0;
        for (var i = 0; i < val.length; i++) {
            var intVal = parseInt(val.substr(i, 1));
            if (i % 2 == 0) {
                intVal *= 2;
                if (intVal > 9) {
                    intVal = 1 + (intVal % 10);
                }
            }
            sum += intVal;
        }
        return sum % 10 == 0;
    }

    resizeImage(image) {
        const width = 300;
        const ratio = width / image.cols;
        const dim = new cv.Size(width, parseInt(image.rows * ratio));

        cv.resize(image, image, dim, cv.INTER_AREA);
    }

    sortRect(a, b) {
        if (a.x > b.x) {
            return 1;
        }
        if (b.x > a.x) {
            return -1;
        }

        return 0;
    }

    getRectangles(contours) {
        let rectangles = [];

        for (let i = 0; i < contours.size(); ++i) {
            rectangles.push(cv.boundingRect(contours.get(i)));
        }
        return rectangles.sort(this.sortRect);
    }

    findGroupsOfNumbers(filteredCard) {
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(
            filteredCard,
            contours,
            hierarchy,
            cv.RETR_EXTERNAL,
            cv.CHAIN_APPROX_SIMPLE
        );
        let groupRectangles = this.getRectangles(contours);

        let digitGroups = [];
        for (let i = 0; i < groupRectangles.length; ++i) {
            let rect = groupRectangles[i];
            let ratio = rect.width / rect.height;

            if (ratio > 2.5 && ratio < 4.0) {
                if (
                    rect.width > 40 &&
                    rect.width < 55 &&
                    rect.height > 10 &&
                    rect.height < 20
                ) {
                    digitGroups.push(rect);
                }
            }
        }
        contours.delete();
        hierarchy.delete();

        return digitGroups;
    }

    findNumbersInGroup(groupRect, grayCard, refDigits, refSize) {
        let groupSrc = new cv.Mat();
        groupSrc = grayCard.roi(groupRect);

        cv.threshold(
            groupSrc,
            groupSrc,
            0,
            255,
            cv.THRESH_BINARY | cv.THRESH_OTSU
        );

        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(
            groupSrc,
            contours,
            hierarchy,
            cv.RETR_EXTERNAL,
            cv.CHAIN_APPROX_SIMPLE
        );
        let digitRectangles = this.getRectangles(contours);
        contours.delete();
        hierarchy.delete();

        let groupOutput = [];

        for (let i = 0; i < digitRectangles.length; ++i) {
            let detectedDigit = this.detectDigit(
                groupSrc,
                digitRectangles[i],
                refDigits,
                refSize
            );
            groupOutput.push(detectedDigit);
        }
        groupSrc.delete();
        return groupOutput;
    }

    applyFilters(grayCard, filteredCard) {
        let rectKernel = new cv.Mat();
        let squareKernel = new cv.Mat();

        rectKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(9, 3));
        squareKernel = cv.getStructuringElement(
            cv.MORPH_RECT,
            new cv.Size(5, 5)
        );

        let tophat = new cv.Mat();
        cv.morphologyEx(grayCard, tophat, cv.MORPH_TOPHAT, rectKernel);

        let gradX = new cv.Mat();
        let kernel = 1,
            xOrder = 1,
            yOrder = 0;
        cv.Sobel(tophat, gradX, cv.CV_32F, xOrder, yOrder, kernel);

        cv.convertScaleAbs(gradX, gradX);
        gradX.convertTo(gradX, cv.CV_8U);

        let thresh = new cv.Mat();
        cv.morphologyEx(gradX, gradX, cv.MORPH_CLOSE, rectKernel);

        cv.threshold(gradX, thresh, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);

        cv.morphologyEx(thresh, filteredCard, cv.MORPH_CLOSE, squareKernel);

        rectKernel.delete();
        squareKernel.delete();
        tophat.delete();
        gradX.delete();
        thresh.delete();
    }

    detectDigit(group, digitRect, refDigits, refSize) {
        let cardDigit = new cv.Mat();
        cardDigit = group.roi(digitRect);

        cv.resize(cardDigit, cardDigit, refSize);

        let scores = [];
        let cardDigitDst = new cv.Mat();
        let mask = new cv.Mat();

        for (let i = 0; i < refDigits.length; ++i) {
            cv.matchTemplate(
                cardDigit,
                refDigits[i],
                cardDigitDst,
                cv.TM_CCOEFF,
                mask
            );
            let score = cv.minMaxLoc(cardDigitDst, mask).maxVal;
            scores.push(score);
        }
        cardDigit.delete();
        cardDigitDst.delete();
        mask.delete();

        return scores.indexOf(Math.max(...scores));
    }
}
