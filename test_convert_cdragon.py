import unittest
from tools.convert_cdragon import convert

SAMPLE={"setData":[{"name":"Example TFT Set","number":99,"champions":[
 {"apiName":"TFT99_Example","name":"Example","cost":2,"traits":["Test"]},
 {"apiName":"TFT99_Spawn","name":"Dummy","cost":1,"traits":["Test"],"isSpawn":True},
 {"apiName":"TFT99_Invalid","name":"Invalid","cost":8,"traits":["Test"]}
]}],"items":[{"name":"Global item not belonging to selected set"}]}

class ConverterTests(unittest.TestCase):
    def test_requires_explicit_set(self):
        with self.assertRaises(ValueError): convert(SAMPLE,5,"nature")
    def test_never_claims_golden_spatula_or_infers_items(self):
        output=convert(SAMPLE,0,"nature")
        self.assertEqual(output["metadata"]["status"],"candidate-unverified")
        self.assertEqual(len(output["champions"]),1)
        self.assertEqual(output["items"],[])
    def test_target_season_is_explicit(self):
        self.assertEqual(convert(SAMPLE,0,"ink")["season"],"ink")
        with self.assertRaises(ValueError): convert(SAMPLE,0,"other")

if __name__=="__main__":
    unittest.main()
