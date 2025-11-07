import React from "react";
import { View, ScrollView, TouchableOpacity, Image, Text, } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PantallaBienvenida({ navigation }: any) {
	return (
		<SafeAreaView 
			style={{
				flex: 1,
				backgroundColor: "#FFFFFF",
			}}>
			<ScrollView  
				style={{
					flex: 1,
					backgroundColor: "#E6F4F1",
				}}>
				<View 
					style={{
						marginVertical: 167,
						marginHorizontal: 14,
					}}>
					<View 
						style={{
							alignItems: "center",
							marginBottom: 32,
						}}>
						<TouchableOpacity 
							style={{
								backgroundColor: "#CB78001A",
								borderRadius: 24,
								padding: 28,
							}} onPress={()=>alert('Pressed!')}>
							<Image
								source = {{uri: "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/b005ad8e-2840-4d20-bfa2-9d7235aea6b9"}} 
								resizeMode = {"stretch"}
								style={{
									borderRadius: 24,
									width: 40,
									height: 40,
								}}
							/>
						</TouchableOpacity>
					</View>
					<View 
						style={{
							marginBottom: 32,
						}}>
						<Text 
							style={{
								color: "#212121",
								fontSize: 30,
								fontWeight: "bold",
								textAlign: "center",
								marginBottom: 12,
								marginHorizontal: 46,
							}}>
							{"Bienvenido a Splitty"}
						</Text>
						<Text 
							style={{
								color: "#555555",
								fontSize: 18,
								textAlign: "center",
								marginHorizontal: 17,
							}}>
							{"Gestiona tus gastos compartidos de forma\nsencilla y transparente"}
						</Text>
					</View>
					<View 
						style={{
							paddingTop: 24,
							paddingBottom: 40,
							marginBottom: 32,
						}}>
						<View 
							style={{
								flexDirection: "row",
								alignItems: "center",
								marginBottom: 16,
							}}>
							<View 
								style={{
									width: 8,
									height: 8,
									backgroundColor: "#033E30",
									borderRadius: 33554400,
									marginRight: 12,
								}}>
							</View>
							<View 
								style={{
									alignItems: "center",
									paddingBottom: 1,
								}}>
								<Text 
									style={{
										color: "#555555",
										fontSize: 14,
									}}>
									{"Divide gastos automáticamente"}
								</Text>
							</View>
						</View>
						<View 
							style={{
								flexDirection: "row",
								alignItems: "center",
								marginBottom: 16,
							}}>
							<View 
								style={{
									width: 8,
									height: 8,
									backgroundColor: "#033E30",
									borderRadius: 33554400,
									marginRight: 12,
								}}>
							</View>
							<View 
								style={{
									alignItems: "center",
									paddingBottom: 1,
								}}>
								<Text 
									style={{
										color: "#555555",
										fontSize: 14,
									}}>
									{"Mantén registro de quién debe qué"}
								</Text>
							</View>
						</View>
						<View 
							style={{
								flexDirection: "row",
								alignItems: "center",
							}}>
							<View 
								style={{
									width: 8,
									height: 8,
									backgroundColor: "#033E30",
									borderRadius: 33554400,
									marginRight: 12,
								}}>
							</View>
							<View 
								style={{
									alignItems: "center",
									paddingBottom: 1,
								}}>
								<Text 
									style={{
										color: "#555555",
										fontSize: 14,
									}}>
									{"Simplifica los pagos entre amigos"}
								</Text>
							</View>
						</View>
					</View>
					<TouchableOpacity 
						style={{
							alignItems: "center",
							backgroundColor: "#033E30",
							borderRadius: 12,
							paddingVertical: 20,
							marginBottom: 32,
							shadowColor: "#0000001A",
							shadowOpacity: 0.1,
							shadowOffset: {
							    width: 0,
							    height: 4
							},
							shadowRadius: 6,
							elevation: 6,
						}} onPress={() => navigation.navigate('InicioSesion')}>
						<Text 
							style={{
								color: "#FFFFFF",
								fontSize: 18,
								fontWeight: "bold",
							}}>
							{"Comenzar"}
						</Text>
					</TouchableOpacity>
					<View 
						style={{
							alignItems: "center",
							paddingTop: 24,
						}}>
						<Text 
							style={{
								color: "#555555",
								fontSize: 12,
							}}>
							{"Gratis para siempre • Sin límites de gastos"}
						</Text>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}