// -------------------------------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License (MIT). See LICENSE for license information.
// -------------------------------------------------------------------------------------------------
var specialCharProcessor = require('../inputProcessor/specialCharProcessor');
var hl7SequenceHandler = require('./hl7EscapeSequence');
var hl7v2TemplatePreprocessor = require('../inputProcessor/templatePreprocessor');
var CoverageArray = require('./coverage-array');
var dataHandler = require('../dataHandler/dataHandler');

module.exports = class hl7v2 extends dataHandler {
    constructor() {
        super("hl7v2");
    }

    parseSrcData(msg) {
        return new Promise((fulfill, reject) => {

            try{
                var data = parseHL7v2(msg);
                fulfill(data);
            }
            catch (err) {
                reject(err);
            }
        });
    }

    preProcessTemplate(templateStr) {
        return super.preProcessTemplate(hl7v2TemplatePreprocessor.Process(templateStr));
    }

    postProcessResult(inResult) {
        return super.postProcessResult(inResult);
    }

    getConversionResultMetadata(context) {
        return {
            'unusedSegments': parseCoverageReport(context),
            'invalidAccess': parseInvalidAccess(context)
        };
    }
};

function doesElementExistFactory(type, line) {
    return ((element) => element.type === type && element.line === line);
}

// Original Copyright Microsoft Corporation. Licensed under the MIT License.
// Modifications Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.

/*
function parseHL7v2(msg) {
    var segments = msg.split(/\r?\n/);
    if (segments[0].substring(0, 3) !== "MSH") {
        throw new Error("Invalid HL7 v2 message, first segment id = " + segments[0].substring(0, 3));
    }

    if (segments[0].length < 8) {
        throw new Error("MSH segment missing separators!");
    }

    let separatorsStr = segments[0].substring(3, 8);
    if (new Set(separatorsStr).size !== separatorsStr.length) {
        throw new Error(`Duplicate separators!`);
    }

    //Discover the separators for the segments.
    var fieldSeparator = segments[0][3];
    var componentSeparator = segments[0][4];
    var repetitionSeparator = segments[0][5];
    var escapeCharacter = segments[0][6];
    var subcomponentSeparator = segments[0][7];

    if (escapeCharacter != '\\') {
        throw Error("Escape character is *not* backslash. This has not been tested!");
    }

    var out = {};
    out.v2 = {};
    out.v2.data = [];
    out.v2.meta = [];

    for (var i = 0; i < segments.length; i++) {
        var fields = segments[i].split(fieldSeparator);
        if (fields[0].length) // Checking that it is not an empty line at the end of the file. 
        {
            var seg = CoverageArray.makeUndefinedAccessReporterArray(fields[0], i);
            out.v2.meta.push(fields[0]);
            for (var f = 1; f < fields.length; f++) {
                if (i == 0 && f == 1) //First field of the MSH segment lists the separators
                {
                    var separators = CoverageArray.makeCoverageArray();
                    separators.push([fields[f]]);
                    separators.accessed[0] = true;
                    seg.push(separators);
                }
                else {
                    if (fields[f].length == 0) //If the field is not present set null
                    {
                        seg.push(null);
                    }
                    else {
                        var ocomps = CoverageArray.makeCoverageArray();

                        createComponents(ocomps,
                            fields[f],
                            fieldSeparator,
                            componentSeparator,
                            subcomponentSeparator,
                            repetitionSeparator);

                        var reps = fields[f].split(repetitionSeparator);
                        for (var repId = 0; repId < reps.length; repId++) {
                            let repIdArr = [];
                            createComponents(repIdArr,
                                reps[repId],
                                fieldSeparator,
                                componentSeparator,
                                subcomponentSeparator,
                                repetitionSeparator);
                            ocomps.repeats.push(repIdArr);
                        }

                        seg.push(ocomps);
                    }
                }
            }
            out.v2.data.push(seg);
        }
    }
    return out;
}*/
// End of Amazon addition.

function parseHL7v2(msg) {
    var segments = msg.split(/\r?\n/);
    if (segments[0].substring(0, 3) !== "MSH") {
        throw new Error("Invalid HL7 v2 message, first segment id = " + segments[0].substring(0, 3));
    }

    if (segments[0].length < 8) {
        throw new Error("MSH segment missing separators!");
    }

    let separatorsStr = segments[0].substring(3, 8);
    if (new Set(separatorsStr).size !== separatorsStr.length) {
        throw new Error(`Duplicate separators!`);
    }

    //Discover the separators for the segments.
    var fieldSeparator = segments[0][3];
    var componentSeparator = segments[0][4];
    var repetitionSeparator = segments[0][5];
    var escapeCharacter = segments[0][6];
    var subcomponentSeparator = segments[0][7];

    if (escapeCharacter != '\\') {
        throw Error("Escape character is *not* backslash. This has not been tested!");
    }

    var out = {};
    out.v2 = {};
    out.v2.data = [];
    out.v2.meta = [];

    
    var totalText = "";
    var obxIndex = 0;
    var foundTxOBX = false;
    var newOBX = [];

    for (var i = 0; i < segments.length; i++) {
        var fields = segments[i].split(fieldSeparator);
        if (fields[0].length) // Checking that it is not an empty line at the end of the file. 
        {
            var seg = CoverageArray.makeUndefinedAccessReporterArray(fields[0], i);
	    
	    
	    if (fields[0] == 'OBX' && fields[2] == 'TX') {
		    //console.log("skipping OBX TX");
		    foundTxOBX = true;
	    } else out.v2.meta.push(fields[0]);

            for (var f = 1; f < fields.length; f++) {
                if (i == 0 && f == 1) //First field of the MSH segment lists the separators
                {
                    var separators = CoverageArray.makeCoverageArray();
                    separators.push([fields[f]]);
                    separators.accessed[0] = true;
                    seg.push(separators);
                }
                else {
                    if (fields[f].length == 0) //If the field is not present set null
                    {
                        seg.push(null);
                    }
                    else {
                        var ocomps = CoverageArray.makeCoverageArray();

                        createComponents(ocomps,
                            fields[f],
                            fieldSeparator,
                            componentSeparator,
                            subcomponentSeparator,
                            repetitionSeparator);

                        var reps = fields[f].split(repetitionSeparator);
                        for (var repId = 0; repId < reps.length; repId++) {
                            let repIdArr = [];
                            createComponents(repIdArr,
                                reps[repId],
                                fieldSeparator,
                                componentSeparator,
                                subcomponentSeparator,
                                repetitionSeparator);
                            ocomps.repeats.push(repIdArr);
                        }
			if (fields[0] == 'OBX' && fields[2] == 'TX') {
				//console.log('Skipping OBX again for data array');
				foundTxOBX = true;
				if (obxIndex == 0) {
					newOBX[0] = fields[1];
					newOBX[1] = fields[2];
					newOBX[2] = fields[3];
					newOBX[3] = fields[4];
					newOBX[4] = "";
					newOBX[5] = fields[6];
					newOBX[6] = fields[7];
				}
				obxIndex = obxIndex + 1;
			} else seg.push(ocomps);
                    }
                }
            }
            if (fields[0] == 'OBX' && fields[2] == 'TX') {
		    totalText = totalText + fields[5] + " ";
	    } else out.v2.data.push(seg);
	    //console.log(seg.toString());
	   
        }
    }
    //console.log(totalText);
    if (foundTxOBX) {
	    newOBX[4] = totalText;
	    out.v2.meta.push('OBX');
	    var seg = CoverageArray.makeUndefinedAccessReporterArray('OBX', 1);
	    for (var x=0;x<newOBX.length;x++){
		var ocomps = CoverageArray.makeCoverageArray();

                        createComponents(ocomps,
                            newOBX[x],
                            fieldSeparator,
                            componentSeparator,
                            subcomponentSeparator,
                            repetitionSeparator);
		    seg.push(ocomps);
	    }
	    out.v2.data.push(seg);
	    //console.log(seg.toString());
    }
    //console.log(out.v2.meta.toString());
    //console.log(out.v2.data.toString());
    return out;
}

function createComponents(containerArr, dataStr, fieldSeparator, componentSeparator, subcomponentSeparator, repetitionSeparator) {
    var comps = dataStr.split(componentSeparator);
    for (var c = 0; c < comps.length; c++) //Loop over components (e.g., '^')
    {
        if (comps[c].length) {
            var sub = comps[c].split(subcomponentSeparator); //Subcomponents (e.g. '&')
            sub = sub.map(x => {
                return specialCharProcessor.Escape(
                    hl7SequenceHandler.Unescape(x, fieldSeparator, componentSeparator, subcomponentSeparator, repetitionSeparator));
            });
            containerArr.push(sub);
        }
        else {
            containerArr.push(null);
        }
    }
}

function parseCoverageReport(parsedMsg) {
    var coverageReport = [];
    var v2 = parsedMsg.v2;
    v2.data.forEach((segment, segmentIndex) => {
        segment.forEach((component, componentIndex) => {
            if (component) {
                component.accessed.forEach((record, recordIndex) => {
                    if (!record) {
                        // The index needs to be corrected because the array doesn't contain the first column, so the indexes are one too small.
                        var correctedIndex = componentIndex + 1;

                        if (!coverageReport.some(doesElementExistFactory(v2.meta[segmentIndex], segmentIndex))) {
                            coverageReport.push({
                                type: v2.meta[segmentIndex],
                                line: segmentIndex,
                                field: []
                            });
                        }

                        var fields = coverageReport.find(doesElementExistFactory(v2.meta[segmentIndex], segmentIndex)).field;

                        if (!fields.some((element) => element.index === correctedIndex)) {
                            fields.push({
                                index: correctedIndex,
                                component: []
                            });
                        }

                        var item = { "index": recordIndex };
                        item.value = component[recordIndex] ? component[recordIndex][0] : "";
                        fields.find((element) => element.index === correctedIndex).component.push(item);
                    }
                });
            }
        });
    });

    return coverageReport;
}

function parseInvalidAccess(parsedMsg) {
    var invalidAccesses = [];
    parsedMsg.v2.data.forEach((segment) => {
        segment.undefinedFieldsAccessed.forEach((field) => {
            if (!invalidAccesses.some(doesElementExistFactory(segment.name, segment.line))) {
                invalidAccesses.push({
                    type: segment.name,
                    line: segment.line,
                    field: []
                });
            }

            invalidAccesses.find(doesElementExistFactory(segment.name, segment.line))
                .field.push({ index: (field ? parseInt(field, 10) + 1 : "undefined") });
        });
    });

    return invalidAccesses;
}

module.exports.parseHL7v2 = parseHL7v2;
