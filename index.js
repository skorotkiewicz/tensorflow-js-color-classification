// const tf = require("@tensorflow/tfjs");
const tf = require("@tensorflow/tfjs-node");

// Train new model => true; Use trained model => false;
let TRAIN = false;
if (process.env.NODE_ENV === "train") {
  TRAIN = true;
}

const colorData = {
  entries: [
    { r: 255, g: 0, b: 0, label: "red-ish" },
    { r: 254, g: 0, b: 0, label: "red-ish" },
    { r: 253, g: 0, b: 0, label: "red-ish" },
    { r: 0, g: 255, b: 0, label: "green-ish" },
    { r: 0, g: 254, b: 0, label: "green-ish" },
    { r: 0, g: 253, b: 0, label: "green-ish" },
    { r: 0, g: 0, b: 255, label: "blue-ish" },
    { r: 0, g: 0, b: 254, label: "blue-ish" },
    { r: 0, g: 0, b: 253, label: "blue-ish" },
  ],
};

let labelList = ["red-ish", "green-ish", "blue-ish"];

const parseData = () => {
  const colors = [];
  const labels = [];

  //Get the data from the JSON.
  for (let record of colorData.entries) {
    //Create an array with the 3 RGB colors and parse them to be between 0 and 1.
    const color = [record.r / 255, record.g / 255, record.b / 255];

    //Push the color to the color array.
    colors.push(color);

    //Picks the index of the label from the record and push to the array of label indexes.
    labels.push(labelList.indexOf(record.label));
  }

  //Create a 2d tensor with the colors.
  const xs = tf.tensor2d(colors);

  //Create a 1d tensor with the index of the labels.
  const labelsTensor = tf.tensor1d(labels, "int32");

  //Do a one hot encoding with the labels tensor to especify the right one with 1 and the others with 0.
  const ys = tf.oneHot(labelsTensor, 9).cast("float32");

  //Dispose the labelsTensor after using it to create the ys tensor.
  labelsTensor.dispose();

  return {
    xs,
    ys,
  };
};

const createModel = () => {
  //Creates a sequential model,
  //that is a model where the outputs of one layer are the inputs to the next layer.
  const model = tf.sequential();

  //Creates a dense (fully connected) layer that will have x units nodes and y inputShape.
  const hidden = tf.layers.dense({
    //Number of nodes of the hidden layer.
    units: 16,
    //Shape of the input.
    inputShape: [3],
    //Sigmoid is an activation function that squashs the numbers between 0 and 1.
    // activation: "sigmoid",
    activation: "relu",
  });

  const output = tf.layers.dense({
    //Number of nodes of the output layer.
    units: 9,
    //Softmax is an activation function that not only squashs the numbers between 0 and 1
    //but garantee that the results adds up to 1 (100%).
    activation: "softmax",
  });

  //Adds both layers to the model
  model.add(hidden);
  model.add(output);

  const LEARNING_RATE = 0.2;

  //Create a optimizer with stochastic gradient descent
  //to go down the graph of the loss function to try to minimize that loss.
  const optimizer = tf.train.sgd(LEARNING_RATE);

  //compiles the model
  model.compile({
    optimizer,
    //Categorical Crossentropy is a loss function designed to compare two probability distribution
    //and look at how much caos there is between them (the crossentropy between then).
    loss: "categoricalCrossentropy",
    //List of metrics to be evaluated by the model during training and testing
    //typically metrics=['accuracy'] is used.
    metrics: ["accuracy"],
  });

  return model;
};

const train = async (model, tensors) => {
  //Train the model
  await model.fit(tensors.xs, tensors.ys, {
    //Whether to shuffle the training data before each epoch.
    shuffle: true,
    //Float between 0 and 1: fraction of the training data to be used as validation data.
    validationSplit: 0.1,
    //The number of times to iterate over the training dataset.
    epochs: 1000,
  });

  await model.save("file://trainedModel");

  return model;
};

const main = async () => {
  let trainedModel;

  if (TRAIN) {
    const tensors = parseData();
    const model = createModel();
    trainedModel = await train(model, tensors);
  } else {
    trainedModel = await tf.loadLayersModel("file://trainedModel/model.json");
  }

  //Executes the provided function fn and after it is executed,
  //cleans up all intermediate tensors allocated by fn except those returned by fn.
  tf.tidy(() => {
    const r = 255;
    const g = 102;
    const b = 204;

    const input = tf.tensor2d([[r / 255, g / 255, b / 255]]);

    //After train, execute the inference for the input tensors.
    let results = trainedModel.predict(input);

    console.log("\n");
    results.print();

    //Returns the indice of the maximum value along an axis.
    let argMax = results.argMax(1);

    //Synchronously downloads the values from the tf.Tensor.
    //That is needed because the data is still on the GPU.
    let index = argMax.dataSync()[0];

    //The output value should be the index of the output label list.
    let label = labelList[index];

    console.log("Color label:", label);
    console.log("\n");
  });
};

main();
